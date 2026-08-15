import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";
import { composicaoLucro } from "@/lib/lucro";

function mesLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("pt-BR", { month: "short", year: "2-digit" });
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const dozeAtras = new Date(anoAtual, hoje.getMonth() - 11, 1);

  const [servicos, docsFiscais, abertos] = await Promise.all([
    prisma.servico.findMany({
      where: {
        statusAtual: "CONCLUIDO",
        dataConclusao: { gte: dozeAtras },
      },
      select: {
        dataConclusao: true,
        valorEstimado: true,
        valorRepasse: true,
        valorMaterial: true,
        custoFixo: true,
        valorGarantia: true,
        taxaPercentual: true,
        impostoPercentual: true,
        formaPagamento: true,
      },
    }),

    prisma.documentoFiscal.findMany({
      where: {
        ativo: true,
        statusPagamento: "PAGO",
        dataPagamento: { gte: dozeAtras },
        valorPago: { not: null },
      },
      select: { dataPagamento: true, valorPago: true },
    }),

    prisma.servico.count({
      where: { statusAtual: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    }),
  ]);

  type MesData = { mes: string; receita: number; repasse: number; material: number; custoFixo: number; garantia: number; taxa: number; imposto: number; lucro: number; contabilidade: number; servicos: number };
  const meses: MesData[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(anoAtual, hoje.getMonth() - i, 1);
    meses.push({
      mes: mesLabel(d.getFullYear(), d.getMonth() + 1),
      receita: 0,
      repasse: 0,
      material: 0,
      custoFixo: 0,
      garantia: 0,
      taxa: 0,
      imposto: 0,
      lucro: 0,
      contabilidade: 0,
      servicos: 0,
    });
  }

  for (const s of servicos) {
    if (!s.dataConclusao) continue;
    const d = new Date(s.dataConclusao);
    const mesIdx = (d.getFullYear() - anoAtual) * 12 + (d.getMonth() + 1 - mesAtual) + 11;
    if (mesIdx < 0 || mesIdx > 11) continue;
    const c = composicaoLucro({
      valorEstimado: s.valorEstimado,
      valorRepasse: s.valorRepasse,
      valorMaterial: s.valorMaterial,
      formaPagamento: s.formaPagamento,
      custoFixo: s.custoFixo,
      valorGarantia: s.valorGarantia,
      taxaPercentual: s.taxaPercentual,
      impostoPercentual: s.impostoPercentual,
    });
    if (!c) continue;
    meses[mesIdx].receita += c.receita;
    meses[mesIdx].repasse += c.repasse;
    meses[mesIdx].material += c.material;
    meses[mesIdx].custoFixo += c.custoFixo;
    meses[mesIdx].garantia += c.garantia;
    meses[mesIdx].taxa += c.taxa;
    meses[mesIdx].imposto += c.imposto;
    meses[mesIdx].lucro += c.lucro;
    meses[mesIdx].servicos += 1;
  }

  for (const d of docsFiscais) {
    if (!d.dataPagamento) continue;
    const dt = new Date(d.dataPagamento);
    const mesIdx = (dt.getFullYear() - anoAtual) * 12 + (dt.getMonth() + 1 - mesAtual) + 11;
    if (mesIdx < 0 || mesIdx > 11) continue;
    meses[mesIdx].contabilidade += Number(d.valorPago);
  }

  for (const m of meses) {
    m.receita = Math.round(m.receita * 100) / 100;
    m.repasse = Math.round(m.repasse * 100) / 100;
    m.material = Math.round(m.material * 100) / 100;
    m.custoFixo = Math.round(m.custoFixo * 100) / 100;
    m.garantia = Math.round(m.garantia * 100) / 100;
    m.taxa = Math.round(m.taxa * 100) / 100;
    m.imposto = Math.round(m.imposto * 100) / 100;
    m.lucro = Math.round(m.lucro * 100) / 100;
    m.contabilidade = Math.round(m.contabilidade * 100) / 100;
  }

  const mesCorrente = meses[11];
  const lucroLiquido = Math.round((mesCorrente.lucro - mesCorrente.contabilidade) * 100) / 100;

  return jsonResponse({
    meses,
    resumoMesAtual: {
      receita: mesCorrente.receita,
      repasse: mesCorrente.repasse,
      material: mesCorrente.material,
      custoFixo: mesCorrente.custoFixo,
      garantia: mesCorrente.garantia,
      taxa: mesCorrente.taxa,
      imposto: mesCorrente.imposto,
      lucro: mesCorrente.lucro,
      contabilidade: mesCorrente.contabilidade,
      lucroLiquido,
      servicos: mesCorrente.servicos,
      abertos,
    },
  });
}
