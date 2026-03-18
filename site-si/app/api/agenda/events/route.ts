import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, unauthorized, badRequest } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const fromRaw = request.nextUrl.searchParams.get("from");
  const toRaw = request.nextUrl.searchParams.get("to");
  if (!fromRaw || !toRaw) return badRequest("Parâmetros from e to são obrigatórios (ISO date).");

  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return badRequest("Datas inválidas. Use formato ISO.");
  }

  const servicos = await prisma.servico.findMany({
    where: {
      dataAgendamento: {
        gte: from,
        lt: to,
      },
    },
    orderBy: { dataAgendamento: "asc" },
    select: {
      id: true,
      codigo: true,
      descricao: true,
      statusAtual: true,
      dataAgendamento: true,
      cliente: { select: { nome: true } },
      categoria: { select: { nome: true } },
    },
  });

  const events = servicos
    .filter((s) => s.dataAgendamento)
    .map((s) => ({
      id: s.id,
      title: `${s.codigo} - ${s.cliente.nome}`,
      descricao: s.descricao,
      statusAtual: s.statusAtual,
      start: s.dataAgendamento?.toISOString(),
      end: new Date((s.dataAgendamento as Date).getTime() + 60 * 60 * 1000).toISOString(),
      categoria: s.categoria?.nome ?? null,
    }));

  return jsonResponse(events);
}

