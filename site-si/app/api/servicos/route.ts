import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { gerarCodigoServico } from "@/lib/codigo-servico";
import { jsonResponse, unauthorized, forbidden, badRequest, conflict, errorResponse } from "@/lib/api-response";
import { enqueueServicoSync, processAgendaSyncQueue } from "@/lib/agenda-sync";
import { parseClienteAddressFromBody } from "@/lib/cliente-address";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const status = request.nextUrl.searchParams.get("status")?.trim();
  const clienteId = request.nextUrl.searchParams.get("cliente_id")?.trim();
  const dataInicio = request.nextUrl.searchParams.get("data_inicio")?.trim();
  const dataFim = request.nextUrl.searchParams.get("data_fim")?.trim();
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const where: Record<string, unknown> = {};
  if (status) where.statusAtual = status;
  if (clienteId) where.clienteId = clienteId;
  if (dataInicio || dataFim) {
    where.dataAbertura = {};
    if (dataInicio) (where.dataAbertura as Record<string, Date>).gte = new Date(dataInicio);
    if (dataFim) (where.dataAbertura as Record<string, Date>).lte = new Date(dataFim);
  }
  if (q) {
    where.OR = [
      { codigo: { contains: q } },
      { cliente: { nome: { contains: q } } },
      { cliente: { email: { contains: q } } },
      { cliente: { telefone: { contains: q } } },
    ];
  }

  const servicos = await prisma.servico.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { id: true, nome: true, email: true, telefone: true } },
      categoria: { select: { id: true, nome: true } },
    },
  });
  return jsonResponse(servicos);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    let clienteId: string;

    if (body.id_cliente) {
      clienteId = String(body.id_cliente);
      const exists = await prisma.cliente.findUnique({ where: { id: clienteId } });
      if (!exists) return badRequest("Cliente não encontrado.");
    } else if (body.cliente) {
      const c = body.cliente;
      const nome = String(c.nome || "").trim();
      const nomeContato = c.nomeContato != null ? String(c.nomeContato).trim() || null : null;
      const email = String(c.email || "").trim().toLowerCase();
      const telefone = String(c.telefone || "").trim();
      const addr = parseClienteAddressFromBody(c as Record<string, unknown>);
      const observacoes = c.observacoes != null ? String(c.observacoes).trim() || null : null;
      if (!nome || !email || !telefone) {
        return badRequest("Cliente novo exige cliente (nome), e-mail e telefone.");
      }
      const existingEmail = await prisma.cliente.findUnique({ where: { email } });
      if (existingEmail) {
        clienteId = existingEmail.id;
      } else {
        const existingTel = await prisma.cliente.findUnique({ where: { telefone } });
        if (existingTel) clienteId = existingTel.id;
        else {
          const novo = await prisma.cliente.create({
            data: { nome, nomeContato, email, telefone, ...addr, observacoes },
          });
          clienteId = novo.id;
        }
      }
    } else {
      return badRequest("Informe id_cliente ou objeto cliente (nome, email, telefone).");
    }

    const categoriaId = (body.categoria_id ?? body.categoriaId ?? "").trim() || null;
    if (!categoriaId) return badRequest("categoria_id é obrigatório.");
    const categoriaExiste = await prisma.categoriaServico.findUnique({ where: { id: categoriaId } });
    if (!categoriaExiste) return badRequest("Categoria não encontrada.");

    const descricao = String(body.descricao || "").trim();
    if (!descricao) return badRequest("descricao é obrigatória.");

    const dataAbertura = body.data_abertura ? new Date(body.data_abertura) : new Date();
    const dataAgendamento = body.data_agendamento ? new Date(body.data_agendamento) : null;
    const codigo = await gerarCodigoServico();

    const imagensJson = body.imagens;
    const imagensStr =
      Array.isArray(imagensJson) && imagensJson.length > 0
        ? JSON.stringify(imagensJson.map((u: unknown) => String(u)))
        : null;

    const formaPagamento = (body.forma_pagamento ?? body.formaPagamento ?? "").trim() || null;

    const servico = await prisma.servico.create({
      data: {
        codigo,
        clienteId,
        categoriaId,
        descricao,
        statusAtual: "ABERTO",
        dataAbertura,
        dataAgendamento,
        prazoEstimado: body.prazo_estimado ? new Date(body.prazo_estimado) : null,
        valorEstimado: body.valor_estimado != null ? Number(body.valor_estimado) : null,
        enderecoServico: body.endereco != null ? String(body.endereco).trim() || null : null,
        contatoPreferencial: body.contato != null ? String(body.contato).trim() || null : null,
        imagens: imagensStr,
        formaPagamento: formaPagamento || null,
        googleSyncState: dataAgendamento ? "PENDING_CREATE" : "IN_SYNC",
      },
      include: {
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });

    await prisma.statusHist.create({
      data: {
        servicoId: servico.id,
        statusAnterior: null,
        statusNovo: "ABERTO",
        idAutor: auth.userId,
      },
    });

    await prisma.nota.create({
      data: {
        servicoId: servico.id,
        conteudo: descricao,
        visivelCliente: false,
        idAutor: auth.userId,
      },
    });

    if (servico.dataAgendamento) {
      await enqueueServicoSync(servico.id, "UPSERT", { source: "servicos_post" });
      await processAgendaSyncQueue().catch((err) => {
        console.warn("Falha ao processar sync após criação de serviço:", err);
      });
    }

    return jsonResponse(
      {
        id: servico.id,
        codigo: servico.codigo,
        clienteId: servico.clienteId,
        cliente: servico.cliente,
        categoriaId: servico.categoriaId,
        categoria: servico.categoria,
        descricao: servico.descricao,
        statusAtual: servico.statusAtual,
        dataAbertura: servico.dataAbertura,
        dataAgendamento: servico.dataAgendamento,
        prazoEstimado: servico.prazoEstimado,
        valorEstimado: servico.valorEstimado,
        enderecoServico: servico.enderecoServico,
        contatoPreferencial: servico.contatoPreferencial,
        imagens: servico.imagens ? (JSON.parse(servico.imagens) as string[]) : null,
        formaPagamento: servico.formaPagamento,
        createdAt: servico.createdAt,
      },
      201
    );
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar serviço", "INTERNAL_ERROR", 500);
  }
}
