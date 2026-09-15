import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";
import { isTransitionAllowed } from "@/lib/status";

/**
 * POST /api/tecnicos/me/servicos/[id]/reagendar
 * O técnico propõe uma nova data — não reagenda de fato. Fecha a visita em
 * aberto (se houver), grava a data proposta + motivo no próprio Servico e
 * move o status para AGUARDANDO_REAGENDAMENTO. Só o dono aprova (o que
 * grava dataAgendamento de verdade) ou recusa, em
 * /api/servicos/[id]/reagendamento/{aprovar,recusar}.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const body = await request.json().catch(() => ({}));
    const comentario = String(body.comentario || "").trim();
    if (!comentario) return badRequest("comentario é obrigatório — descreva o motivo do reagendamento.");

    const novaDataRaw = body.novaData;
    if (!novaDataRaw) return badRequest("novaData é obrigatória.");
    const novaData = new Date(novaDataRaw);
    if (isNaN(novaData.getTime())) return badRequest("novaData inválida.");
    if (novaData <= new Date()) return badRequest("novaData precisa ser no futuro.");

    const servico = await prisma.servico.findUnique({ where: { id } });
    if (!servico) return notFound();

    const statusNovo = "AGUARDANDO_REAGENDAMENTO";
    if (!isTransitionAllowed(servico.statusAtual, statusNovo)) {
      return badRequest(`Serviço já está em ${servico.statusAtual}.`);
    }

    const visitaAberta = await prisma.visitaTecnico.findFirst({
      where: { servicoId: id, tecnicoId: guard.tecnicoId, fimEm: null },
      orderBy: { inicioEm: "desc" },
    });

    await prisma.$transaction([
      ...(visitaAberta
        ? [prisma.visitaTecnico.update({ where: { id: visitaAberta.id }, data: { fimEm: new Date() } })]
        : []),
      prisma.nota.create({
        data: {
          servicoId: id,
          conteudo: `Pedido de reagendamento: ${comentario}`,
          visivelCliente: false,
          visivelTecnico: true,
          idAutor: guard.tecnicoId,
        },
      }),
      prisma.servico.update({
        where: { id },
        data: {
          statusAtual: statusNovo,
          dataReagendamentoProposta: novaData,
          motivoReagendamento: comentario,
          updatedAt: new Date(),
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
    ]);

    return jsonResponse({ statusAtual: statusNovo });
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/reagendar]", e);
    return errorResponse("Erro ao propor reagendamento", "INTERNAL_ERROR", 500);
  }
}
