export const CUSTO_FIXO = 50;

const TAXA_POR_PAGAMENTO: Record<string, number> = {
  DINHEIRO: 0,
  PIX: 0,
  DEBITO: 3.99,
  CREDITO: 3.99,
};

export function calcularLucroReal({
  valorEstimado,
  valorRepasse,
  valorMaterial,
  formaPagamento,
}: {
  valorEstimado: number | null | undefined;
  valorRepasse: number | null | undefined;
  valorMaterial: number | null | undefined;
  formaPagamento: string | null | undefined;
}): number | null {
  if (valorEstimado == null) return null;

  const taxa = TAXA_POR_PAGAMENTO[formaPagamento ?? ""] ?? 0;
  const coef = 1 - taxa / 100;

  const liquido = (valorEstimado - CUSTO_FIXO) * coef;
  const repasse = valorRepasse ?? 0;
  const material = valorMaterial ?? 0;

  return Math.round((liquido - repasse - material) * 100) / 100;
}

export function taxaPorPagamento(formaPagamento: string | null | undefined): number {
  return TAXA_POR_PAGAMENTO[formaPagamento ?? ""] ?? 0;
}
