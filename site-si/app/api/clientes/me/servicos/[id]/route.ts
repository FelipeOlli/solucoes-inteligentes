import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isCliente } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isCliente(auth)) return auth ? forbidden() : unauthorized();

  const id = (await params).id;
  const servico = await prisma.servico.findFirst({
    where: { id, clienteId: auth.id_cliente },
    include: {
      categoria: { select: { nome: true } },
      statusHist: { orderBy: { createdAt: "asc" } },
      notas: { where: { visivelCliente: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!servico) return notFound();

  const descricaoLinha =
    servico.descricao.trim() !== ""
      ? [
          {
            type: "descricao" as const,
            id: `${servico.id}-descricao`,
            conteudo: servico.descricao,
            createdAt: servico.dataAbertura,
          },
        ]
      : [];

  const timeline = [
    ...descricaoLinha,
    ...servico.statusHist.map((h) => ({
      type: "status" as const,
      id: h.id,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      createdAt: h.createdAt,
    })),
    ...servico.notas.map((n) => ({
      type: "nota" as const,
      id: n.id,
      conteudo: n.conteudo,
      createdAt: n.createdAt,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return jsonResponse({
    id: servico.id,
    codigo: servico.codigo,
    tipoServico: servico.tipoServico ?? servico.categoria?.nome ?? "",
    descricao: servico.descricao,
    statusAtual: servico.statusAtual,
    dataAbertura: servico.dataAbertura,
    dataAgendamento: servico.dataAgendamento,
    prazoEstimado: servico.prazoEstimado,
    valorEstimado: servico.valorEstimado,
    timeline,
  });
}
