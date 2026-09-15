import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { SELECT_SERVICO_TECNICO, serializeServicoParaTecnico } from "@/lib/serializers/servico-tecnico";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const servico = await prisma.servico.findUnique({
      where: { id },
      select: SELECT_SERVICO_TECNICO,
    });
    if (!servico) return notFound();

    return jsonResponse(serializeServicoParaTecnico(servico));
  } catch (e) {
    console.error("[GET /api/tecnicos/me/servicos/[id]]", e);
    return errorResponse("Erro ao buscar serviço", "INTERNAL_ERROR", 500);
  }
}
