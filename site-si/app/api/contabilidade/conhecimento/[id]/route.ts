import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const artigo = await prisma.artigoConhecimento.findUnique({
    where: { id, ativo: true },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });
  if (!artigo) return notFound("Artigo não encontrado.");

  return jsonResponse(artigo);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const artigo = await prisma.artigoConhecimento.findUnique({ where: { id, ativo: true } });
  if (!artigo) return notFound("Artigo não encontrado.");

  const body = await request.json().catch(() => ({}));
  const { titulo, categoria, descricao, conteudo } = body as Record<string, string>;

  const atualizado = await prisma.artigoConhecimento.update({
    where: { id },
    data: {
      ...(titulo !== undefined ? { titulo: titulo.trim() } : {}),
      ...(categoria !== undefined ? { categoria: categoria.trim() || null } : {}),
      ...(descricao !== undefined ? { descricao: descricao.trim() || null } : {}),
      ...(conteudo !== undefined ? { conteudo } : {}),
    },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });

  return jsonResponse(atualizado);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const artigo = await prisma.artigoConhecimento.findUnique({ where: { id, ativo: true } });
  if (!artigo) return notFound("Artigo não encontrado.");

  await prisma.artigoConhecimento.update({ where: { id }, data: { ativo: false } });

  return jsonResponse({ ok: true });
}
