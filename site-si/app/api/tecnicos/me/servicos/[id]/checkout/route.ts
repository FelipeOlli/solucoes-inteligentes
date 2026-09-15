import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";

/**
 * POST /api/tecnicos/me/servicos/[id]/checkout
 * Fecha a visita em aberto. Não muda o status do serviço sozinho — o
 * técnico escolhe o próximo status (AGUARDANDO_PECA, CONCLUIDO, etc.) numa
 * ação separada.
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
    const observacao = body?.observacao ? String(body.observacao).trim().slice(0, 2000) : undefined;

    const visitaAberta = await prisma.visitaTecnico.findFirst({
      where: { servicoId: id, tecnicoId: guard.tecnicoId, fimEm: null },
      orderBy: { inicioEm: "desc" },
    });
    if (!visitaAberta) return badRequest("Não há check-in em aberto para este serviço.");

    const visita = await prisma.visitaTecnico.update({
      where: { id: visitaAberta.id },
      data: { fimEm: new Date(), observacao },
    });

    return jsonResponse({ id: visita.id, inicioEm: visita.inicioEm, fimEm: visita.fimEm });
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/checkout]", e);
    return errorResponse("Erro ao registrar check-out", "INTERNAL_ERROR", 500);
  }
}
