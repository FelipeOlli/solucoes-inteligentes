import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, unauthorized } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const categoria = searchParams.get("categoria") ?? "";

  const artigos = await prisma.artigoConhecimento.findMany({
    where: {
      ativo: true,
      ...(q ? { OR: [{ titulo: { contains: q, mode: "insensitive" } }, { descricao: { contains: q, mode: "insensitive" } }] } : {}),
      ...(categoria ? { categoria } : {}),
    },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
  });

  return jsonResponse(artigos);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Body inválido.");

  const { titulo, categoria, descricao, conteudo } = body as Record<string, string>;
  if (!titulo?.trim()) return badRequest("Campo 'titulo' obrigatório.");
  if (conteudo === undefined) return badRequest("Campo 'conteudo' obrigatório.");

  const artigo = await prisma.artigoConhecimento.create({
    data: {
      titulo: titulo.trim(),
      categoria: categoria?.trim() || null,
      descricao: descricao?.trim() || null,
      conteudo,
    },
    include: { anexos: true },
  });

  return jsonResponse(artigo, 201);
}
