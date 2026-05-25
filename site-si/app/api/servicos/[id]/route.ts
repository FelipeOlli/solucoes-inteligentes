import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-response";
import { enqueueServicoSync, processAgendaSyncQueue } from "@/lib/agenda-sync";

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
      cliente: {
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          logradouro: true,
          bairro: true,
          cidade: true,
          uf: true,
          cep: true,
        },
      },
      categoria: { select: { id: true, nome: true } },
      tecnico: { select: { id: true, nome: true } },
      statusHist: { orderBy: { createdAt: "asc" } },
      notas: { orderBy: { createdAt: "asc" } },
      campoHist: { orderBy: { createdAt: "asc" } },
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
    campoHist: servico.campoHist.map((c) => ({
      id: c.id,
      campo: c.campo,
      valorAnterior: c.valorAnterior,
      valorNovo: c.valorNovo,
      createdAt: c.createdAt,
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

  const before = await prisma.servico.findUnique({
    where: { id },
    select: {
      id: true,
      dataAgendamento: true,
      statusAtual: true,
      valorEstimado: true,
      categoriaId: true,
      formaPagamento: true,
      tecnicoId: true,
      convidadoEmail: true,
      googleEventId: true,
      googleEtag: true,
      googleUpdatedAt: true,
      categoria: { select: { nome: true } },
      tecnico: { select: { nome: true } },
    },
  });
  if (!before) return notFound();

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.prazo_estimado !== undefined) data.prazoEstimado = body.prazo_estimado ? new Date(body.prazo_estimado) : null;
  if (body.valor_estimado !== undefined) data.valorEstimado = body.valor_estimado != null ? Number(body.valor_estimado) : null;
  if (body.valor_repasse !== undefined) data.valorRepasse = body.valor_repasse != null ? Number(body.valor_repasse) : null;
  if (body.valor_material !== undefined) data.valorMaterial = body.valor_material != null ? Number(body.valor_material) : null;
  if (body.data_agendamento !== undefined) data.dataAgendamento = body.data_agendamento ? new Date(body.data_agendamento) : null;
  if (body.descricao !== undefined) data.descricao = String(body.descricao).trim();
  if (body.endereco_servico !== undefined) data.enderecoServico = body.endereco_servico ? String(body.endereco_servico).trim() : null;
  if (body.contato_preferencial !== undefined) data.contatoPreferencial = body.contato_preferencial ? String(body.contato_preferencial).trim() : null;
  if (body.categoria_id !== undefined) data.categoriaId = body.categoria_id ? String(body.categoria_id).trim() : null;
  if (body.forma_pagamento !== undefined || body.formaPagamento !== undefined) {
    const fp = String(body.forma_pagamento ?? body.formaPagamento ?? "").trim().toUpperCase();
    data.formaPagamento = fp || null;
  }
  if (body.tecnico_id !== undefined) data.tecnicoId = body.tecnico_id ? String(body.tecnico_id).trim() : null;
  if (body.imagens !== undefined) {
    const arr = Array.isArray(body.imagens) ? body.imagens.map((u: unknown) => String(u)) : [];
    data.imagens = arr.length > 0 ? JSON.stringify(arr) : null;
  }
  if (body.convidado_email !== undefined) {
    data.convidadoEmail = body.convidado_email ? String(body.convidado_email).trim() : null;
  }

  // Detect reagendamento: old date exists AND new date is different and non-null
  const novaData = data.dataAgendamento as Date | null | undefined;
  const reagendamento =
    body.data_agendamento !== undefined &&
    before.dataAgendamento != null &&
    novaData != null &&
    new Date(before.dataAgendamento).getTime() !== novaData.getTime();

  if (reagendamento) {
    // Archive current Google event before clearing (old event stays in Google)
    await prisma.servicoEventoHist.create({
      data: {
        servicoId: id,
        googleEventId: before.googleEventId ?? null,
        dataAgendamento: before.dataAgendamento!,
        convidadoEmail: before.convidadoEmail ?? null,
      },
    });
    data.googleEventId = null;
    data.googleEtag = null;
    data.googleUpdatedAt = null;
    data.googleSyncState = "PENDING_CREATE";
    data.googleLastError = null;
  } else {
    const touchedSchedule =
      body.data_agendamento !== undefined ||
      body.descricao !== undefined ||
      body.categoria_id !== undefined ||
      body.valor_estimado !== undefined;
    if (touchedSchedule) {
      data.googleSyncState = "PENDING_UPDATE";
      data.googleLastError = null;
    }
  }

  const servico = await prisma.servico.update({
    where: { id },
    data,
    include: {
      cliente: { select: { id: true, nome: true, email: true, telefone: true } },
      categoria: { select: { id: true, nome: true } },
      tecnico: { select: { id: true, nome: true } },
    },
  });

  // Build CampoHist entries for changed fields
  const historicoEntries: { campo: string; valorAnterior: string | null; valorNovo: string | null }[] = [];

  if (body.data_agendamento !== undefined) {
    const ant = before.dataAgendamento?.toISOString() ?? null;
    const nov = servico.dataAgendamento?.toISOString() ?? null;
    if (ant !== nov) historicoEntries.push({ campo: "dataAgendamento", valorAnterior: ant, valorNovo: nov });
  }
  if (body.valor_estimado !== undefined) {
    const ant = before.valorEstimado != null ? String(before.valorEstimado) : null;
    const nov = servico.valorEstimado != null ? String(servico.valorEstimado) : null;
    if (ant !== nov) historicoEntries.push({ campo: "valor", valorAnterior: ant, valorNovo: nov });
  }
  if (body.categoria_id !== undefined && (before.categoriaId ?? null) !== (servico.categoriaId ?? null)) {
    historicoEntries.push({ campo: "categoria", valorAnterior: before.categoria?.nome ?? null, valorNovo: servico.categoria?.nome ?? null });
  }
  if ((body.forma_pagamento !== undefined || body.formaPagamento !== undefined)) {
    const ant = (before.formaPagamento as string | null) ?? null;
    const nov = (servico.formaPagamento as string | null) ?? null;
    if (ant !== nov) historicoEntries.push({ campo: "formaPagamento", valorAnterior: ant, valorNovo: nov });
  }
  if (body.tecnico_id !== undefined && (before.tecnicoId ?? null) !== (servico.tecnicoId ?? null)) {
    historicoEntries.push({ campo: "tecnico", valorAnterior: before.tecnico?.nome ?? null, valorNovo: servico.tecnico?.nome ?? null });
  }
  if (body.convidado_email !== undefined) {
    const ant = before.convidadoEmail ?? null;
    const nov = servico.convidadoEmail ?? null;
    if (ant !== nov) historicoEntries.push({ campo: "convidado", valorAnterior: ant, valorNovo: nov });
  }

  if (historicoEntries.length > 0) {
    await prisma.campoHist.createMany({
      data: historicoEntries.map((h) => ({
        servicoId: id,
        campo: h.campo,
        valorAnterior: h.valorAnterior,
        valorNovo: h.valorNovo,
        idAutor: (auth as { userId: string }).userId ?? null,
      })),
    });
  }

  if (servico.dataAgendamento) {
    await enqueueServicoSync(id, "UPSERT", { source: "servicos_patch" });
    await processAgendaSyncQueue().catch((err) => {
      console.warn("Falha ao processar sync após patch de serviço:", err);
    });
  }
  if (before.dataAgendamento && !servico.dataAgendamento) {
    await enqueueServicoSync(id, "DELETE", { source: "servicos_patch_remove_schedule" });
    await processAgendaSyncQueue().catch((err) => {
      console.warn("Falha ao processar sync de remoção de agenda:", err);
    });
  }
  const imagens = servico.imagens ? (JSON.parse(servico.imagens) as string[]) : null;
  return jsonResponse({ ...servico, imagens });
}
