import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, badRequest, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return jsonResponse(tecnicos);
  } catch (e) {
    console.error("[GET /api/tecnicos]", e);
    return errorResponse("Erro ao listar técnicos", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    const nome = String(body.nome ?? "").trim();
    if (!nome) return badRequest("nome é obrigatório.");

    const tecnico = await prisma.tecnico.create({
      data: {
        nome,
        endereco: body.endereco ? String(body.endereco).trim() : null,
        telefone: body.telefone ? String(body.telefone).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        chavePix: body.chavePix ? String(body.chavePix).trim() : null,
        banco: body.banco ? String(body.banco).trim() : null,
        agencia: body.agencia ? String(body.agencia).trim() : null,
        conta: body.conta ? String(body.conta).trim() : null,
      },
    });
    return jsonResponse(tecnico, 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar técnico", "INTERNAL_ERROR", 500);
  }
}
