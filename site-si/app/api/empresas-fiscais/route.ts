import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, unauthorized } from "@/lib/api-response";

const REGIMES_VALIDOS = ["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL", "MEI"] as const;
type Regime = (typeof REGIMES_VALIDOS)[number];

const PORTES_VALIDOS = ["MEI", "ME", "EPP"] as const;
type Porte = (typeof PORTES_VALIDOS)[number];

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const empresas = await prisma.empresaFiscal.findMany({
    where: { ativo: true },
    orderBy: { razaoSocial: "asc" },
    select: { id: true, cnpj: true, razaoSocial: true, regime: true, porte: true },
  });

  return jsonResponse(empresas);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Body inválido.");

  const cnpj = String(body.cnpj || "").trim().replace(/\D/g, "");
  if (cnpj.length !== 14) return badRequest("CNPJ inválido (deve ter 14 dígitos).");

  const razaoSocial = String(body.razaoSocial || "").trim();
  if (!razaoSocial) return badRequest("razaoSocial é obrigatório.");

  const regime = String(body.regime || "SIMPLES_NACIONAL") as Regime;
  if (!REGIMES_VALIDOS.includes(regime))
    return badRequest("regime inválido.");

  const porte = String(body.porte || "ME") as Porte;
  if (!PORTES_VALIDOS.includes(porte))
    return badRequest("porte inválido.");

  const cnpjFormatado = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

  const existente = await prisma.empresaFiscal.findUnique({ where: { cnpj: cnpjFormatado } });
  if (existente) {
    if (!existente.ativo) {
      const reativada = await prisma.empresaFiscal.update({
        where: { id: existente.id },
        data: { ativo: true, razaoSocial, regime: regime, porte: porte },
      });
      return jsonResponse(reativada, 200);
    }
    return jsonResponse(existente, 200);
  }

  const empresa = await prisma.empresaFiscal.create({
    data: {
      cnpj: cnpjFormatado,
      razaoSocial,
      regime: regime,
      porte: porte,
    },
  });

  return jsonResponse(empresa, 201);
}
