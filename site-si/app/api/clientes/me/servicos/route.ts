import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isCliente } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isCliente(auth)) return auth ? forbidden() : unauthorized();

  const servicos = await prisma.servico.findMany({
    where: { clienteId: auth.id_cliente },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      codigo: true,
      tipoServico: true,
      categoria: { select: { nome: true } },
      statusAtual: true,
      dataAbertura: true,
      dataAgendamento: true,
      prazoEstimado: true,
      valorEstimado: true,
    },
  });
  const list = servicos.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    tipoServico: s.tipoServico ?? s.categoria?.nome ?? "",
    statusAtual: s.statusAtual,
    dataAbertura: s.dataAbertura,
    dataAgendamento: s.dataAgendamento,
    prazoEstimado: s.prazoEstimado,
    valorEstimado: s.valorEstimado,
  }));
  return jsonResponse(list);
}
