import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTecnico } from "@/lib/guards";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { SELECT_SERVICO_TECNICO, serializeServicoParaTecnico } from "@/lib/serializers/servico-tecnico";

/**
 * GET /api/tecnicos/me/servicos?filtro=hoje|semana|abertos
 * Sempre escopado por tecnicoId do token — nunca aceitar tecnicoId do caller.
 */
export async function GET(request: NextRequest) {
  const guard = await requireTecnico(request);
  if (!guard.ok) return guard.res;

  try {
    const filtro = request.nextUrl.searchParams.get("filtro") ?? "abertos";

    const where: Record<string, unknown> = { tecnicoId: guard.tecnicoId };

    if (filtro === "hoje") {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 1);
      where.dataAgendamento = { gte: inicio, lt: fim };
    } else if (filtro === "semana") {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 7);
      where.dataAgendamento = { gte: inicio, lt: fim };
    } else {
      where.statusAtual = { notIn: ["CONCLUIDO", "CANCELADO"] };
    }

    const servicos = await prisma.servico.findMany({
      where,
      select: SELECT_SERVICO_TECNICO,
      orderBy: { dataAgendamento: "asc" },
    });

    return jsonResponse(servicos.map(serializeServicoParaTecnico));
  } catch (e) {
    console.error("[GET /api/tecnicos/me/servicos]", e);
    return errorResponse("Erro ao listar serviços", "INTERNAL_ERROR", 500);
  }
}
