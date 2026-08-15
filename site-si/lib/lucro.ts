const TAXA_POR_PAGAMENTO: Record<string, number> = {
  DINHEIRO: 0,
  PIX: 0,
  CHEQUE: 0,
  DEBITO: 3.99,
  CREDITO: 3.99,
};

type ServicoLucro = {
  valorEstimado?: number | null | undefined;
  valorRepasse?: number | null | undefined;
  valorMaterial?: number | null | undefined;
  formaPagamento?: string | null | undefined;
  custoFixo?: number | null | undefined;
  valorGarantia?: number | null | undefined;
  taxaPercentual?: number | null | undefined;
  impostoPercentual?: number | null | undefined;
};

export type ComposicaoLucro = {
  receita: number;
  taxaPct: number;
  taxa: number;
  impostoPct: number;
  imposto: number;
  repasse: number;
  material: number;
  custoFixo: number;
  garantia: number;
  lucro: number;
  margem: number;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Decompõe o lucro real de um serviço.
 *
 * Serviços criados a partir do orçamento (calculadora) trazem `taxaPercentual`
 * e `impostoPercentual` gravados no momento da criação (snapshot) — usam a
 * taxa real por parcelas e o imposto do Simples (DAS+ISS). Serviços criados à
 * mão (sem snapshot) caem no fallback: taxa fixa por forma de pagamento e
 * sem imposto, preservando o cálculo antigo.
 */
export function composicaoLucro(s: ServicoLucro): ComposicaoLucro | null {
  if (s.valorEstimado == null) return null;

  const receita = s.valorEstimado;
  const taxaPct = s.taxaPercentual ?? TAXA_POR_PAGAMENTO[s.formaPagamento ?? ""] ?? 0;
  const impostoPct = s.impostoPercentual ?? 0;
  const repasse = s.valorRepasse ?? 0;
  const material = s.valorMaterial ?? 0;
  const custoFixo = s.custoFixo ?? 0;
  const garantia = s.valorGarantia ?? 0;

  const taxa = receita * (taxaPct / 100);
  const imposto = receita * (impostoPct / 100);
  const lucro = receita - taxa - imposto - repasse - material - custoFixo - garantia;

  return {
    receita: round2(receita),
    taxaPct,
    taxa: round2(taxa),
    impostoPct,
    imposto: round2(imposto),
    repasse: round2(repasse),
    material: round2(material),
    custoFixo: round2(custoFixo),
    garantia: round2(garantia),
    lucro: round2(lucro),
    margem: receita > 0 ? lucro / receita : 0,
  };
}

export function calcularLucroReal(s: ServicoLucro): number | null {
  return composicaoLucro(s)?.lucro ?? null;
}

export function taxaPorPagamento(formaPagamento: string | null | undefined): number {
  return TAXA_POR_PAGAMENTO[formaPagamento ?? ""] ?? 0;
}
