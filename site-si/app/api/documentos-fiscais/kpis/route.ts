import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, unauthorized } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId") || undefined;
  const where = { ativo: true, ...(empresaId ? { empresaFiscalId: empresaId } : {}) };

  const [total, pendentes, proximoVencimento, gasto12m] = await Promise.all([
    prisma.documentoFiscal.count({ where }),

    prisma.documentoFiscal.count({
      where: { ...where, statusProcessamento: { in: ["PENDENTE", "PROCESSANDO", "MANUAL"] } },
    }),

    prisma.obrigacaoFiscal.findFirst({
      where: {
        ativo: true,
        status: { in: ["PENDENTE", "ATRASADA"] },
        ...(empresaId ? { empresaFiscalId: empresaId } : {}),
        vencimento: { gte: new Date() },
      },
      orderBy: { vencimento: "asc" },
      select: { vencimento: true, tipo: true, valorTotal: true },
    }),

    prisma.documentoFiscal.aggregate({
      where: {
        ...where,
        valorTotal: { not: null },
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        tipoDocumento: { in: ["DAS", "DARF_MAED"] },
      },
      _sum: { valorTotal: true },
    }),
  ]);

  return jsonResponse({
    total,
    pendentes,
    proximoVencimento,
    totalGasto12m: gasto12m._sum.valorTotal ?? 0,
  });
}
