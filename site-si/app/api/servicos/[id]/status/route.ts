import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { isTransitionAllowed, STATUS_LIST } from "@/lib/status";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-response";
import { enqueueServicoSync, processAgendaSyncQueue } from "@/lib/agenda-sync";

async function getServicoId(idOrCodigo: string): Promise<string | null> {
  const byId = await prisma.servico.findUnique({ where: { id: idOrCodigo }, select: { id: true } });
  if (byId) return byId.id;
  const byCodigo = await prisma.servico.findUnique({ where: { codigo: idOrCodigo }, select: { id: true } });
  return byCodigo?.id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  const body = await request.json();
  const statusNovo = String(body.status_novo || body.statusNovo || "").trim();
  if (!STATUS_LIST.includes(statusNovo as (typeof STATUS_LIST)[number])) {
    return badRequest("status_novo inválido. Use um dos: " + STATUS_LIST.join(", "));
  }

  const servico = await prisma.servico.findUnique({ where: { id } });
  if (!servico) return notFound();

  if (!isTransitionAllowed(servico.statusAtual, statusNovo)) {
    return badRequest(`Transição de ${servico.statusAtual} para ${statusNovo} não permitida.`);
  }

  const dataConclusao = statusNovo === "CONCLUIDO" || statusNovo === "CANCELADO" ? new Date() : null;

  await prisma.$transaction([
    prisma.servico.update({
      where: { id },
      data: {
        statusAtual: statusNovo,
        dataConclusao,
        updatedAt: new Date(),
        googleSyncState: statusNovo === "CANCELADO" ? "PENDING_DELETE" : "PENDING_UPDATE",
        googleLastError: null,
      },
    }),
    prisma.statusHist.create({
      data: {
        servicoId: id,
        statusAnterior: servico.statusAtual,
        statusNovo,
        idAutor: auth.userId,
      },
    }),
  ]);

  const updated = await prisma.servico.findUnique({
    where: { id },
    include: { cliente: { select: { id: true, nome: true, email: true, telefone: true } } },
  });

  if (statusNovo === "CANCELADO") {
    await enqueueServicoSync(id, "DELETE", { source: "status_patch_cancel" });
  } else {
    await enqueueServicoSync(id, "UPSERT", { source: "status_patch" });
  }
  await processAgendaSyncQueue().catch((err) => {
    console.warn("Falha ao processar sync após mudança de status:", err);
  });

  return jsonResponse(updated!);
}
