import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDono } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";
import { enqueueServicoSync, processAgendaSyncQueue } from "@/lib/agenda-sync";

/**
 * POST /api/servicos/[id]/reagendamento/aprovar
 * Aceita a proposta do técnico: dataAgendamento passa a valer de verdade,
 * status vai para AGENDADO, e a proposta é limpa.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDono(request);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  try {
    const servico = await prisma.servico.findUnique({ where: { id } });
    if (!servico) return notFound();
    if (!servico.dataReagendamentoProposta) {
      return badRequest("Este serviço não tem proposta de reagendamento pendente.");
    }

    await prisma.$transaction([
      prisma.servico.update({
        where: { id },
        data: {
          dataAgendamento: servico.dataReagendamentoProposta,
          dataReagendamentoProposta: null,
          motivoReagendamento: null,
          statusAtual: "AGENDADO",
          updatedAt: new Date(),
          googleSyncState: "PENDING_UPDATE",
          googleLastError: null,
        },
      }),
      prisma.statusHist.create({
        data: {
          servicoId: id,
          statusAnterior: servico.statusAtual,
          statusNovo: "AGENDADO",
          idAutor: guard.auth.userId,
        },
      }),
    ]);

    await enqueueServicoSync(id, "UPSERT", { source: "reagendamento_aprovado" });
    await processAgendaSyncQueue().catch((err) => {
      console.warn("Falha ao processar sync após aprovar reagendamento:", err);
    });

    return jsonResponse({ statusAtual: "AGENDADO", dataAgendamento: servico.dataReagendamentoProposta });
  } catch (e) {
    console.error("[POST /api/servicos/[id]/reagendamento/aprovar]", e);
    return errorResponse("Erro ao aprovar reagendamento", "INTERNAL_ERROR", 500);
  }
}
