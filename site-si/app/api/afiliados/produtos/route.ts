import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, badRequest, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const produtos = await prisma.produtoAfiliado.findMany({
      where: { favorito: true },
      orderBy: { criadoEm: "desc" },
    });
    return jsonResponse(produtos);
  } catch (e) {
    console.error("[GET /api/afiliados/produtos]", e);
    return errorResponse("Erro ao listar favoritos", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    const { marketplace, externalId, titulo, imagemUrl, preco, urlOriginal, urlAfiliado } = body;

    if (!marketplace || !externalId || !titulo || !urlOriginal || !urlAfiliado) {
      return badRequest("Campos obrigatórios: marketplace, externalId, titulo, urlOriginal, urlAfiliado.");
    }

    const produto = await prisma.produtoAfiliado.upsert({
      where: { marketplace_externalId: { marketplace, externalId } },
      update: { titulo, imagemUrl: imagemUrl ?? null, preco: preco ?? null, urlOriginal, urlAfiliado, favorito: true },
      create: { marketplace, externalId, titulo, imagemUrl: imagemUrl ?? null, preco: preco ?? null, urlOriginal, urlAfiliado, favorito: true },
    });

    return jsonResponse(produto, 201);
  } catch (e) {
    console.error("[POST /api/afiliados/produtos]", e);
    return errorResponse("Erro ao salvar produto", "INTERNAL_ERROR", 500);
  }
}
