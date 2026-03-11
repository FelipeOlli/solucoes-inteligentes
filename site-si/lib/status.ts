export const STATUS_LIST = [
  "ABERTO",
  "AGENDADO",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECA",
  "AGUARDANDO_CLIENTE",
  "CONCLUIDO",
  "CANCELADO",
] as const;

export type Status = (typeof STATUS_LIST)[number];

const TRANSITIONS: Record<string, Status[]> = {
  ABERTO: ["AGENDADO", "EM_ANDAMENTO", "AGUARDANDO_PECA", "AGUARDANDO_CLIENTE", "CANCELADO"],
  AGENDADO: ["ABERTO", "EM_ANDAMENTO", "AGUARDANDO_PECA", "AGUARDANDO_CLIENTE", "CANCELADO"],
  EM_ANDAMENTO: ["ABERTO", "AGENDADO", "AGUARDANDO_PECA", "AGUARDANDO_CLIENTE", "CONCLUIDO", "CANCELADO"],
  AGUARDANDO_PECA: ["ABERTO", "AGENDADO", "EM_ANDAMENTO", "AGUARDANDO_CLIENTE", "CANCELADO"],
  AGUARDANDO_CLIENTE: ["ABERTO", "AGENDADO", "EM_ANDAMENTO", "AGUARDANDO_PECA", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
};

export function isTransitionAllowed(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to as Status);
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
