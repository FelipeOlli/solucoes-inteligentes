import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
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

  const servicoId = await getServicoId((await params).id);
  if (!servicoId) return notFound("Serviço não encontrado.");

  const body = await request.json().catch(() => ({}));
  const startRaw = String(body.start || body.data_agendamento || "").trim();
  if (!startRaw) return badRequest("Campo start/data_agendamento é obrigatório.");

  const nextDate = new Date(startRaw);
  if (Number.isNaN(nextDate.getTime())) return badRequest("Data inválida.");

  const updated = await prisma.servico.update({
    where: { id: servicoId },
    data: { dataAgendamento: nextDate, googleSyncState: "PENDING_UPDATE", googleLastError: null },
    select: { id: true, codigo: true, dataAgendamento: true, googleSyncState: true },
  });

  await enqueueServicoSync(servicoId, "UPSERT", { source: "agenda_api" });
  await processAgendaSyncQueue().catch((err) => {
    console.warn("Falha ao processar fila agenda após reagendamento:", err);
  });

  return jsonResponse(updated);
}

