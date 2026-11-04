import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";

/**
 * Contadores leves para a navegação do admin (badge da sidebar).
 * Separado de GET /api/servicos para não puxar a lista inteira em toda página.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const [abertos, total] = await Promise.all([
    prisma.servico.count({
      where: { statusAtual: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    }),
    prisma.servico.count(),
  ]);

  return jsonResponse({ abertos, total });
}
