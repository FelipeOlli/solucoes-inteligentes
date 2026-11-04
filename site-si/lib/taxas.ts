/**
 * Tabelas de taxa de cartão (SumUp) e imposto (Simples Nacional Anexo III).
 *
 * Fonte única usada pela calculadora de orçamento e pelo serviço (criação,
 * edição de forma/parcelas e composição do lucro).
 */

// Taxas REAIS da conta da SI, lidas na calculadora do app SumUp em 11/08/2026.
// Visa/Mastercard, maquininha, recebimento D+1.
//
// Não use as tabelas do site da SumUp: elas não batem com esta conta. A
// fonte de verdade é o app → Calculadora de taxas. Reconfira se o
// faturamento mensal mudar de faixa.
//
// As demais entradas abaixo ("tabela do site") são só simulação por faixa
// de faturamento, lidas em 11/08/2026. "Receba na hora" e "1 dia" são
// idênticas nelas.
export const TAXAS = {
  contaSI: {
    rotulo: "Conta SI (taxas reais — app SumUp, 11/08/2026)",
    pix: 0,
    debito: null as number | null, // ainda não confirmado no app
    credito: [0.049, 0.098, 0.111, 0.125, 0.138, 0.151, 0.164, 0.177, 0.19, 0.201],
  },
  ate20k: {
    rotulo: "Até R$ 20 mil/mês (tabela do site)",
    pix: 0,
    debito: 0.0099 as number | null,
    credito: [
      0.0349, 0.0649, 0.0749, 0.0799, 0.0849, 0.0949, 0.0999, 0.1049, 0.1099,
      0.1149, 0.1249, 0.1399,
    ],
  },
  de20a50k: {
    rotulo: "R$ 20 mil a R$ 50 mil/mês (tabela do site)",
    pix: 0,
    debito: 0.0099 as number | null,
    credito: [
      0.0329, 0.0449, 0.0499, 0.0549, 0.0599, 0.0659, 0.0749, 0.0849, 0.0899,
      0.0879, 0.0949, 0.1049,
    ],
  },
  acima50k: {
    rotulo: "Acima de R$ 50 mil/mês (tabela do site)",
    pix: 0,
    debito: 0.0099 as number | null,
    credito: [
      0.0319, 0.0399, 0.0459, 0.0519, 0.0559, 0.0649, 0.0699, 0.0749, 0.0789,
      0.0849, 0.0899, 0.0999,
    ],
  },
} as const;

export type Faixa = keyof typeof TAXAS;

/** Máximo de parcelas no crédito aceito pela conta da SI. */
export const MAX_PARCELAS = TAXAS.contaSI.credito.length;

// Débito da conta SI ainda não confirmado no app — mantém a taxa usada até
// aqui para não subestimar o custo.
const TAXA_DEBITO_PADRAO_PCT = 3.99;

export function normalizarParcelas(parcelas: number | null | undefined): number {
  const p = Math.trunc(Number(parcelas) || 1);
  return Math.min(Math.max(p, 1), MAX_PARCELAS);
}

/**
 * Taxa da maquininha (em %, ex.: 15.1) cobrada sobre o valor recebido, pela
 * forma de pagamento e número de parcelas — conta real da SI.
 */
export function taxaCartaoPct(
  formaPagamento: string | null | undefined,
  parcelas?: number | null
): number {
  switch (formaPagamento) {
    case "CREDITO":
      return round4(TAXAS.contaSI.credito[normalizarParcelas(parcelas) - 1] * 100);
    case "DEBITO":
      return TAXAS.contaSI.debito != null ? round4(TAXAS.contaSI.debito * 100) : TAXA_DEBITO_PADRAO_PCT;
    default:
      return 0;
  }
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

// Simples Nacional — Anexo III (serviço de reparação e manutenção).
const ANEXO_III = [
  { teto: 180000, nominal: 0.06, deducao: 0, iss: 0.335 },
  { teto: 360000, nominal: 0.112, deducao: 9360, iss: 0.32 },
  { teto: 720000, nominal: 0.135, deducao: 17640, iss: 0.325 },
  { teto: 1800000, nominal: 0.16, deducao: 35640, iss: 0.325 },
  { teto: 3600000, nominal: 0.21, deducao: 125640, iss: 0.335 },
  { teto: 4800000, nominal: 0.33, deducao: 648000, iss: 0 },
];

/**
 * Carga tributária total e sua repartição (frações, ex.: 0.06).
 *
 * A SI recolhe em duas guias: o DAS sai sem ISS (retenção/substituição) e o
 * ISS vai à parte pela Nota Carioca. A soma continua sendo a alíquota cheia
 * do Anexo III — por isso o gross-up usa `total`, nunca só uma das partes.
 *
 * Conferido no PGDAS-D de 05/2026: DAS 3,99% + ISS 2,01% = 6,00%.
 */
export function simples(rbt12: number) {
  const f =
    !rbt12 || rbt12 <= 0
      ? ANEXO_III[0]
      : ANEXO_III.find((x) => rbt12 <= x.teto) || ANEXO_III[ANEXO_III.length - 1];

  const total =
    !rbt12 || rbt12 <= 0 ? f.nominal : (rbt12 * f.nominal - f.deducao) / rbt12;

  const iss = total * f.iss;
  return { total, das: total - iss, iss };
}
