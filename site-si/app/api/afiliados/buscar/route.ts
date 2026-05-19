import { NextRequest } from "next/server";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, badRequest, errorResponse } from "@/lib/api-response";
import { buscarML } from "@/lib/afiliados/mercadolivre";
import { buscarMagalu } from "@/lib/afiliados/magalu";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const marketplace = searchParams.get("marketplace") ?? "ALL";

  if (!q) return badRequest("Parâmetro q é obrigatório.");

  try {
    const tasks: Promise<Awaited<ReturnType<typeof buscarML>>>[] = [];
    if (marketplace === "ML" || marketplace === "ALL") tasks.push(buscarML(q));
    if (marketplace === "MAGALU" || marketplace === "ALL") tasks.push(buscarMagalu(q));

    const results = await Promise.allSettled(tasks);
    const produtos = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    return jsonResponse({ produtos, total: produtos.length });
  } catch (e) {
    console.error("[GET /api/afiliados/buscar]", e);
    return errorResponse("Erro ao buscar produtos", "INTERNAL_ERROR", 500);
  }
}
