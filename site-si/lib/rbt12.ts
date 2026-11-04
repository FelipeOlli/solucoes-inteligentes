import { prisma } from "@/lib/db";
import { simples } from "@/lib/taxas";

export type Rbt12 = {
  valor: number | null;
  fonte: "PGDAS_D" | "FINANCEIRO" | null;
  competencia: Date | null;
  oficial: number | null;
  estimado: number;
};

/**
 * RBT12 (receita bruta acumulada nos 12 meses anteriores ao PA). Prioriza o
 * valor oficial extraído do PGDAS-D mais recente; na ausência, cai numa
 * estimativa somando os serviços concluídos nos 12 meses anteriores ao mês
 * corrente (o mês corrente fica de fora, diferente da janela usada em
 * /api/financeiro/resumo).
 */
export async function obterRbt12(): Promise<Rbt12> {
  const oficialDoc = await prisma.documentoFiscal.findFirst({
    where: { ativo: true, tipoDocumento: "PGDAS_D_RECIBO", rbt12: { not: null } },
    orderBy: { competencia: "desc" },
    select: { rbt12: true, competencia: true },
  });
  const oficial = oficialDoc?.rbt12 != null ? Number(oficialDoc.rbt12) : null;

  const hoje = new Date();
  const fimJanela = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 12, 1);

  const servicos = await prisma.servico.findMany({
    where: {
      statusAtual: "CONCLUIDO",
      dataConclusao: { gte: inicioJanela, lt: fimJanela },
    },
    select: { valorEstimado: true },
  });
  const estimado = Math.round(servicos.reduce((acc, s) => acc + (s.valorEstimado ?? 0), 0) * 100) / 100;

  const usarOficial = oficial != null && oficial > 0;

  return {
    valor: usarOficial ? oficial : estimado > 0 ? estimado : null,
    fonte: usarOficial ? "PGDAS_D" : estimado > 0 ? "FINANCEIRO" : null,
    competencia: usarOficial ? oficialDoc?.competencia ?? null : null,
    oficial,
    estimado,
  };
}

/** Alíquota efetiva atual do Simples (DAS + ISS), em % (ex.: 6). */
export async function impostoAtualPct(): Promise<number> {
  const { valor } = await obterRbt12();
  return Math.round(simples(valor ?? 0).total * 1_000_000) / 10_000;
}
