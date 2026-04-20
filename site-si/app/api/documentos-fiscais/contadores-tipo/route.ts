import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, unauthorized } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId") || undefined;

  const contadores = await prisma.documentoFiscal.groupBy({
    by: ["tipoDocumento"],
    where: { ativo: true, ...(empresaId ? { empresaFiscalId: empresaId } : {}) },
    _count: { _all: true },
  });

  const resultado = contadores.map((c) => ({
    tipo: c.tipoDocumento,
    count: c._count._all,
  }));

  return jsonResponse(resultado);
}
