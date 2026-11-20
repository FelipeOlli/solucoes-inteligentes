import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDono } from "@/lib/guards";
import { jsonResponse, badRequest, errorResponse } from "@/lib/api-response";
import { gerarChaveMcp } from "@/lib/mcp/chaves";

export async function GET(request: NextRequest) {
  const guard = await requireDono(request);
  if (!guard.ok) return guard.res;

  const chaves = await prisma.chaveMcp.findMany({
    orderBy: { criadaEm: "desc" },
    select: { id: true, nome: true, prefixo: true, criadaEm: true, ultimoUso: true, revogadaEm: true },
  });
  return jsonResponse(chaves);
}

export async function POST(request: NextRequest) {
  const guard = await requireDono(request);
  if (!guard.ok) return guard.res;

  try {
    const body = await request.json();
    const nome = String(body.nome || "").trim();
    if (!nome) return badRequest("Informe um nome para a chave.");
    if (nome.length > 80) return badRequest("Nome muito longo (máx. 80 caracteres).");

    const { chave, hash, prefixo } = gerarChaveMcp();
    const registro = await prisma.chaveMcp.create({
      data: { nome, hash, prefixo },
      select: { id: true, nome: true, prefixo: true, criadaEm: true, ultimoUso: true, revogadaEm: true },
    });
    // A chave em claro é devolvida só nesta resposta.
    return jsonResponse({ ...registro, chave }, 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar chave", "INTERNAL_ERROR", 500);
  }
}
