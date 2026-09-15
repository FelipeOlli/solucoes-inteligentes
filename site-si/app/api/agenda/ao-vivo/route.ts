import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDono } from "@/lib/guards";
import { jsonResponse, errorResponse } from "@/lib/api-response";

/**
 * GET /api/agenda/ao-vivo
 * Visitas em andamento (fimEm null) + serviços agendados para hoje que
 * ainda não tiveram check-in. Alimenta o widget "Ao vivo" do dashboard.
 * Polling simples (sem WebSocket) — suficiente para dois técnicos.
 */
export async function GET(request: NextRequest) {
  const guard = await requireDono(request);
  if (!guard.ok) return guard.res;

  try {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(inicioHoje);
    fimHoje.setDate(fimHoje.getDate() + 1);

    const [emAndamento, agendadosHoje] = await Promise.all([
      prisma.visitaTecnico.findMany({
        where: { fimEm: null },
        orderBy: { inicioEm: "asc" },
        select: {
          id: true,
          inicioEm: true,
          tecnico: { select: { id: true, nome: true } },
          servico: { select: { id: true, codigo: true, descricao: true, enderecoServico: true } },
        },
      }),
      prisma.servico.findMany({
        where: {
          dataAgendamento: { gte: inicioHoje, lt: fimHoje },
          statusAtual: { notIn: ["CONCLUIDO", "CANCELADO"] },
          tecnicoId: { not: null },
        },
        select: {
          id: true,
          codigo: true,
          descricao: true,
          dataAgendamento: true,
          statusAtual: true,
          tecnico: { select: { id: true, nome: true } },
        },
      }),
    ]);

    const emAndamentoServicoIds = new Set(emAndamento.map((v) => v.servico.id));
    const aguardandoCheckin = agendadosHoje.filter((s) => !emAndamentoServicoIds.has(s.id));

    return jsonResponse({ emAndamento, aguardandoCheckin });
  } catch (e) {
    console.error("[GET /api/agenda/ao-vivo]", e);
    return errorResponse("Erro ao carregar painel ao vivo", "INTERNAL_ERROR", 500);
  }
}
