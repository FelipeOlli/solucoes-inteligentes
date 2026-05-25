import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";
import { calcularLucroReal, CUSTO_FIXO, taxaPorPagamento } from "@/lib/lucro";

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

  type MesData = { mes: string; receita: number; repasse: number; material: number; taxa: number; custoFixo: number; lucro: number; contabilidade: number; servicos: number };
  const meses: MesData[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(anoAtual, hoje.getMonth() - i, 1);
    meses.push({
      mes: mesLabel(d.getFullYear(), d.getMonth() + 1),
      receita: 0,
      repasse: 0,
      material: 0,
      taxa: 0,
      custoFixo: 0,
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
    const receita = s.valorEstimado ?? 0;
    const repasse = s.valorRepasse ?? 0;
    const material = s.valorMaterial ?? 0;
    const taxaPct = taxaPorPagamento(s.formaPagamento);
    const taxaValor = (receita - CUSTO_FIXO) * taxaPct / 100;
    const lucro = calcularLucroReal({
      valorEstimado: s.valorEstimado,
      valorRepasse: s.valorRepasse,
      valorMaterial: s.valorMaterial,
      formaPagamento: s.formaPagamento,
    }) ?? 0;
    meses[mesIdx].receita += receita;
    meses[mesIdx].repasse += repasse;
    meses[mesIdx].material += material;
    meses[mesIdx].taxa += taxaValor;
    meses[mesIdx].custoFixo += CUSTO_FIXO;
    meses[mesIdx].lucro += lucro;
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
    m.taxa = Math.round(m.taxa * 100) / 100;
    m.custoFixo = Math.round(m.custoFixo * 100) / 100;
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
      taxa: mesCorrente.taxa,
      custoFixo: mesCorrente.custoFixo,
      lucro: mesCorrente.lucro,
      contabilidade: mesCorrente.contabilidade,
      lucroLiquido,
      servicos: mesCorrente.servicos,
      abertos,
    },
  });
}
