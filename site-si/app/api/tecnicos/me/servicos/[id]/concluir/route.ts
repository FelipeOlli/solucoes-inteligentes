import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";
import { isTransitionAllowed } from "@/lib/status";
import { enqueueServicoSync, processAgendaSyncQueue } from "@/lib/agenda-sync";

/**
 * POST /api/tecnicos/me/servicos/[id]/concluir
 * O técnico sinaliza que terminou — não conclui de fato. Fecha a visita em
 * aberto (se houver), grava o comentário como Nota interna (nunca visível
 * ao cliente) e move o status para AGUARDANDO_CONFIRMACAO. Só o dono, pela
 * tela de status já existente, decide se de fato conclui o serviço.
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
    if (!comentario) return badRequest("comentario é obrigatório — descreva o que foi feito.");

    const servico = await prisma.servico.findUnique({ where: { id } });
    if (!servico) return notFound();

    const statusNovo = "AGUARDANDO_CONFIRMACAO";
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
          conteudo: comentario,
          visivelCliente: false,
          visivelTecnico: true,
          idAutor: guard.tecnicoId,
        },
      }),
      prisma.servico.update({
        where: { id },
        data: {
          statusAtual: statusNovo,
          updatedAt: new Date(),
          googleSyncState: "PENDING_UPDATE",
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
    ]);

    await enqueueServicoSync(id, "UPSERT", { source: "tecnico_concluir" });
    await processAgendaSyncQueue().catch((err) => {
      console.warn("Falha ao processar sync após conclusão do técnico:", err);
    });

    return jsonResponse({ statusAtual: statusNovo });
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/concluir]", e);
    return errorResponse("Erro ao concluir atendimento", "INTERNAL_ERROR", 500);
  }
}
