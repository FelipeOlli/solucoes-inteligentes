import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-response";

async function getServicoId(idOrCodigo: string): Promise<string | null> {
  const byId = await prisma.servico.findUnique({ where: { id: idOrCodigo }, select: { id: true } });
  if (byId) return byId.id;
  const byCodigo = await prisma.servico.findUnique({ where: { codigo: idOrCodigo }, select: { id: true } });
  return byCodigo?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  const servico = await prisma.servico.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true, email: true, telefone: true, endereco: true } },
      categoria: { select: { id: true, nome: true } },
      statusHist: { orderBy: { createdAt: "asc" } },
      notas: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!servico) return notFound();

  const imagens = servico.imagens ? (JSON.parse(servico.imagens) as string[]) : null;
  return jsonResponse({
    ...servico,
    imagens,
    statusHist: servico.statusHist.map((h) => ({
      id: h.id,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      idAutor: h.idAutor,
      createdAt: h.createdAt,
    })),
    notas: servico.notas.map((n) => ({
      id: n.id,
      conteudo: n.conteudo,
      visivelCliente: n.visivelCliente,
      idAutor: n.idAutor,
      createdAt: n.createdAt,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.prazo_estimado !== undefined) data.prazoEstimado = body.prazo_estimado ? new Date(body.prazo_estimado) : null;
  if (body.valor_estimado !== undefined) data.valorEstimado = body.valor_estimado != null ? Number(body.valor_estimado) : null;
  if (body.data_agendamento !== undefined) data.dataAgendamento = body.data_agendamento ? new Date(body.data_agendamento) : null;
  if (body.descricao !== undefined) data.descricao = String(body.descricao).trim();
  if (body.endereco_servico !== undefined) data.enderecoServico = body.endereco_servico ? String(body.endereco_servico).trim() : null;
  if (body.contato_preferencial !== undefined) data.contatoPreferencial = body.contato_preferencial ? String(body.contato_preferencial).trim() : null;
  if (body.categoria_id !== undefined) data.categoriaId = body.categoria_id ? String(body.categoria_id).trim() : null;
  if (body.imagens !== undefined) {
    const arr = Array.isArray(body.imagens) ? body.imagens.map((u: unknown) => String(u)) : [];
    data.imagens = arr.length > 0 ? JSON.stringify(arr) : null;
  }

  const servico = await prisma.servico.update({
    where: { id },
    data,
    include: {
      cliente: { select: { id: true, nome: true, email: true, telefone: true } },
      categoria: { select: { id: true, nome: true } },
    },
  });
  const imagens = servico.imagens ? (JSON.parse(servico.imagens) as string[]) : null;
  return jsonResponse({ ...servico, imagens });
}
