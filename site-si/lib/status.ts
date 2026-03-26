export const STATUS_LIST = [
  "ABERTO",
  "AGENDADO",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECA",
  "AGUARDANDO_CLIENTE",
  "AGUARDANDO_PAGAMENTO",
  "CONCLUIDO",
  "CANCELADO",
] as const;

export type Status = (typeof STATUS_LIST)[number];

/** Qualquer destino em STATUS_LIST é permitido; o mesmo status é rejeitado na API (sem linha no histórico). */
export function isTransitionAllowed(from: string, to: string): boolean {
  return from !== to && STATUS_LIST.includes(to as Status);
}

// Legado: categorias agora vêm do banco (CategoriaServico)
export const TIPOS_SERVICO = [
  "Manutenção PC",
  "Rede",
  "CFTV",
  "Elétrica",
  "Porteiro eletrônico",
  "Formatação",
  "Suporte remoto",
  "Suporte presencial",
] as const;
