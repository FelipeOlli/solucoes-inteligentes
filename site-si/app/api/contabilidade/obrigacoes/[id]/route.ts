import { NextRequest } from "next/server";
import {
  PeriodicidadeObrigacao,
  StatusObrigacaoContabil,
  TipoObrigacaoContabil,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { nextDueDate, normalizeDate, normalizeStatus } from "@/lib/contabilidade";
import { upsertGoogleEventForObrigacao } from "@/lib/google-calendar";

async function requireDono(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return { auth: null, denied: auth ? forbidden() : unauthorized() };
  return { auth, denied: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await requireDono(request);
  if (denied) return denied;

  const obrigacao = await prisma.obrigacaoContabil.findUnique({
    where: { id: (await params).id },
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      comentarios: { orderBy: { createdAt: "desc" }, include: { autor: { select: { email: true } } } },
    },
  });
  if (!obrigacao || !obrigacao.ativo) return notFound("Obrigação não encontrada.");
  return jsonResponse(obrigacao);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await requireDono(request);
  if (denied) return denied;

  const id = (await params).id;
  const existing = await prisma.obrigacaoContabil.findUnique({ where: { id } });
  if (!existing || !existing.ativo) return notFound("Obrigação não encontrada.");

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.nome != null) {
    const nome = String(body.nome).trim();
    if (!nome) return badRequest("nome não pode ser vazio.");
    data.nome = nome;
  }

  if (body.tipo != null) {
    const tipo = String(body.tipo) as TipoObrigacaoContabil;
    if (!Object.values(TipoObrigacaoContabil).includes(tipo)) return badRequest("tipo inválido.");
    data.tipo = tipo;
  }

  if (body.periodicidade != null) {
    const periodicidade = String(body.periodicidade) as PeriodicidadeObrigacao;
    if (!Object.values(PeriodicidadeObrigacao).includes(periodicidade)) {
      return badRequest("periodicidade inválida.");
    }
    data.periodicidade = periodicidade;
  }

  let dueDate = existing.proximoVencimento;
  if (body.proximoVencimento != null) {
    try {
      dueDate = normalizeDate(String(body.proximoVencimento));
    } catch {
      return badRequest("proximoVencimento inválido.");
    }
    data.proximoVencimento = dueDate;
  }

  if (body.observacao !== undefined) {
    const observacao = String(body.observacao || "").trim();
    data.observacao = observacao || null;
  }

  if (body.status != null) {
    const requested = String(body.status) as StatusObrigacaoContabil;
    if (!Object.values(StatusObrigacaoContabil).includes(requested)) return badRequest("status inválido.");
    data.status = normalizeStatus(requested, dueDate);
  } else if (body.proximoVencimento != null) {
    data.status = normalizeStatus(undefined, dueDate);
  }

  if (body.marcarConcluida === true) {
    data.status = StatusObrigacaoContabil.CONCLUIDO;
  }

  if (body.avancarCiclo === true) {
    const periodicidade = (data.periodicidade as PeriodicidadeObrigacao) || existing.periodicidade;
    const baseDate = (data.proximoVencimento as Date) || existing.proximoVencimento;
    const next = nextDueDate(baseDate, periodicidade);
    data.proximoVencimento = next;
    data.status = normalizeStatus(undefined, next);
  }

  const updated = await prisma.obrigacaoContabil.update({
    where: { id },
    data,
  });

  if (data.proximoVencimento || data.status || data.nome || data.tipo) {
    try {
      const remote = await upsertGoogleEventForObrigacao(updated);
      if (remote.eventId !== updated.calendarioEventId) {
        await prisma.obrigacaoContabil.update({
          where: { id: updated.id },
          data: { calendarioEventId: remote.eventId },
        });
        updated.calendarioEventId = remote.eventId;
      }
    } catch {
      if (!updated.calendarioEventId) {
        const fallbackId = `contab-${updated.id}`;
        await prisma.obrigacaoContabil.update({
          where: { id: updated.id },
          data: { calendarioEventId: fallbackId },
        });
        updated.calendarioEventId = fallbackId;
      }
    }
  }

  return jsonResponse(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await requireDono(request);
  if (denied) return denied;

  const id = (await params).id;
  const existing = await prisma.obrigacaoContabil.findUnique({ where: { id } });
  if (!existing || !existing.ativo) return notFound("Obrigação não encontrada.");

  await prisma.obrigacaoContabil.update({
    where: { id },
    data: { ativo: false },
  });

  return jsonResponse({ ok: true });
}
