import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, badRequest, conflict, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const categorias = await prisma.categoriaServico.findMany({
      orderBy: { nome: "asc" },
    });
    return jsonResponse(categorias);
  } catch (e) {
    console.error("[GET /api/categorias]", e);
    return errorResponse("Erro ao listar categorias", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    const nome = String(body.nome ?? "").trim();
    if (!nome) return badRequest("nome é obrigatório.");

    const existente = await prisma.categoriaServico.findUnique({ where: { nome } });
    if (existente) return conflict("Já existe uma categoria com esse nome.");

    const categoria = await prisma.categoriaServico.create({ data: { nome } });
    return jsonResponse(categoria, 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar categoria", "INTERNAL_ERROR", 500);
  }
}
