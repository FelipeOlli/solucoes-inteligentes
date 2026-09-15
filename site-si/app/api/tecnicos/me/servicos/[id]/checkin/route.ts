import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";
import { isTransitionAllowed } from "@/lib/status";
import { enqueueServicoSync, processAgendaSyncQueue } from "@/lib/agenda-sync";

/**
 * POST /api/tecnicos/me/servicos/[id]/checkin
 * Abre uma VisitaTecnico e, se o serviço ainda não estiver EM_ANDAMENTO,
 * move o status — reaproveitando o mesmo registro em StatusHist que a rota
 * do dono grava, só que com idAutor = tecnicoId.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const servico = await prisma.servico.findUnique({ where: { id } });
    if (!servico) return notFound();

    const visitaAberta = await prisma.visitaTecnico.findFirst({
      where: { servicoId: id, tecnicoId: guard.tecnicoId, fimEm: null },
    });
    if (visitaAberta) return badRequest("Já existe um check-in em aberto para este serviço.");

    const statusNovo = "EM_ANDAMENTO";
    const mudaStatus = servico.statusAtual !== statusNovo && isTransitionAllowed(servico.statusAtual, statusNovo);

    const [visita] = await prisma.$transaction([
      prisma.visitaTecnico.create({
        data: { servicoId: id, tecnicoId: guard.tecnicoId },
      }),
      ...(mudaStatus
        ? [
            prisma.servico.update({
              where: { id },
              data: {
                statusAtual: statusNovo,
                updatedAt: new Date(),
                googleSyncState: "PENDING_UPDATE" as const,
                googleLastError: null,
              },
            }),
            prisma.statusHist.create({
              data: {
                servicoId: id,
                statusAnterior: servico.statusAtual,
                statusNovo,
                idAutor: guard.tecnicoId,
              },
            }),
          ]
        : []),
    ]);

    if (mudaStatus) {
      await enqueueServicoSync(id, "UPSERT", { source: "tecnico_checkin" });
      await processAgendaSyncQueue().catch((err) => {
        console.warn("Falha ao processar sync após check-in:", err);
      });
    }

    return jsonResponse({ id: visita.id, inicioEm: visita.inicioEm }, 201);
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/checkin]", e);
    return errorResponse("Erro ao registrar check-in", "INTERNAL_ERROR", 500);
  }
}
