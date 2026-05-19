import { NextRequest } from "next/server";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, badRequest, errorResponse } from "@/lib/api-response";
import { buscarML } from "@/lib/afiliados/mercadolivre";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return badRequest("Parâmetro q é obrigatório.");

  try {
    const produtos = await buscarML(q);
    return jsonResponse({ produtos, total: produtos.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[GET /api/afiliados/buscar]", msg);
    return errorResponse(`Falha na busca: ${msg}`, "SEARCH_ERROR", 502);
  }
}
