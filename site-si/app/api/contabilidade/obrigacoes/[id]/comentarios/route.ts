import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const obrigacaoId = (await params).id;
  const exists = await prisma.obrigacaoContabil.findUnique({
    where: { id: obrigacaoId },
    select: { id: true, ativo: true },
  });
  if (!exists || !exists.ativo) return notFound("Obrigação não encontrada.");

  const comentarios = await prisma.comentarioContabil.findMany({
    where: { obrigacaoId },
    orderBy: { createdAt: "desc" },
    include: { autor: { select: { id: true, email: true } } },
  });
  return jsonResponse(comentarios);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const obrigacaoId = (await params).id;
  const exists = await prisma.obrigacaoContabil.findUnique({
    where: { id: obrigacaoId },
    select: { id: true, ativo: true },
  });
  if (!exists || !exists.ativo) return notFound("Obrigação não encontrada.");

  const body = await request.json().catch(() => ({}));
  const conteudo = String(body.conteudo || "").trim();
  if (!conteudo) return badRequest("conteudo é obrigatório.");

  const comentario = await prisma.comentarioContabil.create({
    data: {
      obrigacaoId,
      conteudo,
      autorId: auth.userId,
    },
    include: { autor: { select: { id: true, email: true } } },
  });
  return jsonResponse(comentario, 201);
}
