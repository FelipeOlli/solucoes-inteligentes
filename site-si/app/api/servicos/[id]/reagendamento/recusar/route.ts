import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDono } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";

/**
 * POST /api/servicos/[id]/reagendamento/recusar
 * Recusa a proposta do técnico: limpa a proposta e devolve o serviço para
 * ABERTO — o dono escolhe o próximo status/data pelo fluxo normal.
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
          dataReagendamentoProposta: null,
          motivoReagendamento: null,
          statusAtual: "ABERTO",
          updatedAt: new Date(),
        },
      }),
      prisma.statusHist.create({
        data: {
          servicoId: id,
          statusAnterior: servico.statusAtual,
          statusNovo: "ABERTO",
          idAutor: guard.auth.userId,
        },
      }),
    ]);

    return jsonResponse({ statusAtual: "ABERTO" });
  } catch (e) {
    console.error("[POST /api/servicos/[id]/reagendamento/recusar]", e);
    return errorResponse("Erro ao recusar reagendamento", "INTERNAL_ERROR", 500);
  }
}
