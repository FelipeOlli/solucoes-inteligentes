export const STATUS_LIST = [
  "ABERTO",
  "AGENDADO",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECA",
  "AGUARDANDO_CLIENTE",
  "AGUARDANDO_PAGAMENTO",
  "AGUARDANDO_CONFIRMACAO",
  "AGUARDANDO_REAGENDAMENTO",
  "CONCLUIDO",
  "CANCELADO",
] as const;

export type Status = (typeof STATUS_LIST)[number];

/** Qualquer destino em STATUS_LIST é permitido; o mesmo status é rejeitado na API (sem linha no histórico). */
export function isTransitionAllowed(from: string, to: string): boolean {
  return from !== to && STATUS_LIST.includes(to as Status);
}

/** Rótulo em pt-BR de cada status — fonte única, usada no dashboard, no detalhe do serviço e no app do técnico. */
export const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  AGUARDANDO_CONFIRMACAO: "Aguardando confirmação",
  AGUARDANDO_REAGENDAMENTO: "Aguardando reagendamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

/**
 * Classe de badge por status — as cores vêm das CSS vars `--status-*`,
 * definidas por tema em `app/globals.css` (default / dark / brand-blue).
 * Assim o badge fica legível nos três temas.
 */
export const STATUS_COLOR: Record<string, string> = {
  ABERTO: "status-aberto",
  AGENDADO: "status-agendado",
  EM_ANDAMENTO: "status-andamento",
  AGUARDANDO_PECA: "status-peca",
  AGUARDANDO_CLIENTE: "status-cliente",
  AGUARDANDO_PAGAMENTO: "status-pagamento",
  AGUARDANDO_CONFIRMACAO: "status-confirmacao",
  AGUARDANDO_REAGENDAMENTO: "status-reagendamento",
  CONCLUIDO: "status-concluido",
  CANCELADO: "status-cancelado",
};

export function getStatusBadgeClass(status: string): string {
  return STATUS_COLOR[status] ?? "status-aberto";
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
