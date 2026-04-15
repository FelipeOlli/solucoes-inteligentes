import { NextRequest } from "next/server";
import {
  PeriodicidadeObrigacao,
  StatusObrigacaoContabil,
  TipoObrigacaoContabil,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, unauthorized } from "@/lib/api-response";
import {
  calculateObrigacaoStatus,
  defaultPeriodicidadeFromTipo,
  normalizeDate,
  normalizeStatus,
} from "@/lib/contabilidade";
import { upsertGoogleEventForObrigacao } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const status = request.nextUrl.searchParams.get("status") as StatusObrigacaoContabil | null;
  const tipo = request.nextUrl.searchParams.get("tipo") as TipoObrigacaoContabil | null;
  const where: Record<string, unknown> = { ativo: true };
  if (status && Object.values(StatusObrigacaoContabil).includes(status)) where.status = status;
  if (tipo && Object.values(TipoObrigacaoContabil).includes(tipo)) where.tipo = tipo;

  const obrigacoes = await prisma.obrigacaoContabil.findMany({
    where,
    orderBy: [{ proximoVencimento: "asc" }],
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      comentarios: { orderBy: { createdAt: "desc" }, include: { autor: { select: { email: true } } } },
    },
  });

  const now = new Date();
  const enriched = obrigacoes.map((ob) => ({
    ...ob,
    statusCalculado: ob.status === StatusObrigacaoContabil.CONCLUIDO ? ob.status : calculateObrigacaoStatus(ob.proximoVencimento, now),
  }));
  return jsonResponse(enriched);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const body = await request.json().catch(() => ({}));
  const nome = String(body.nome || "").trim();
  if (!nome) return badRequest("nome é obrigatório.");

  const tipo = String(body.tipo || "") as TipoObrigacaoContabil;
  if (!Object.values(TipoObrigacaoContabil).includes(tipo)) return badRequest("tipo inválido.");

  const periodicidadeRaw = String(body.periodicidade || "").trim() as PeriodicidadeObrigacao;
  const periodicidade = periodicidadeRaw && Object.values(PeriodicidadeObrigacao).includes(periodicidadeRaw)
    ? periodicidadeRaw
    : defaultPeriodicidadeFromTipo(tipo);

  let proximoVencimento: Date;
  try {
    proximoVencimento = normalizeDate(String(body.proximoVencimento || ""));
  } catch {
    return badRequest("proximoVencimento é obrigatório e deve ser uma data válida.");
  }

  const statusRequested = String(body.status || "") as StatusObrigacaoContabil;
  const status = Object.values(StatusObrigacaoContabil).includes(statusRequested)
    ? normalizeStatus(statusRequested, proximoVencimento)
    : normalizeStatus(undefined, proximoVencimento);

  const created = await prisma.obrigacaoContabil.create({
    data: {
      nome,
      tipo,
      periodicidade,
      proximoVencimento,
      status,
      observacao: body.observacao ? String(body.observacao).trim() : null,
      ativo: body.ativo === false ? false : true,
    },
  });

  try {
    const remote = await upsertGoogleEventForObrigacao(created);
    if (remote.eventId !== created.calendarioEventId) {
      created.calendarioEventId = remote.eventId;
      await prisma.obrigacaoContabil.update({
        where: { id: created.id },
        data: { calendarioEventId: remote.eventId },
      });
    }
  } catch {
    const fallback = `contab-${created.id}`;
    created.calendarioEventId = fallback;
    await prisma.obrigacaoContabil.update({
      where: { id: created.id },
      data: { calendarioEventId: fallback },
    });
  }

  return jsonResponse(created, 201);
}
