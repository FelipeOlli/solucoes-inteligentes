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

/** Classe Tailwind (fundo + texto) de cada status — uma cor por status, não mais um bucket "tudo amarelo". */
export const STATUS_COLOR: Record<string, string> = {
  ABERTO: "bg-gray-100 text-gray-800",
  AGENDADO: "bg-indigo-100 text-indigo-800",
  EM_ANDAMENTO: "bg-blue-100 text-blue-800",
  AGUARDANDO_PECA: "bg-orange-100 text-orange-800",
  AGUARDANDO_CLIENTE: "bg-amber-100 text-amber-800",
  AGUARDANDO_PAGAMENTO: "bg-yellow-100 text-yellow-800",
  AGUARDANDO_CONFIRMACAO: "bg-purple-100 text-purple-800",
  AGUARDANDO_REAGENDAMENTO: "bg-pink-100 text-pink-800",
  CONCLUIDO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

export function getStatusBadgeClass(status: string): string {
  return STATUS_COLOR[status] ?? "bg-gray-100 text-gray-800";
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
