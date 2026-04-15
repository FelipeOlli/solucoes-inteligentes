import {
  PeriodicidadeObrigacao,
  StatusObrigacaoContabil,
  TipoObrigacaoContabil,
} from "@prisma/client";

const WARNING_WINDOW_DAYS = 10;

export function normalizeDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida.");
  }
  return date;
}

export function calculateObrigacaoStatus(
  dueDate: Date,
  now = new Date()
): StatusObrigacaoContabil {
  const dueAt = dueDate.getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dueAt < todayStart) return StatusObrigacaoContabil.VENCIDO;
  const diffDays = Math.ceil((dueAt - todayStart) / (1000 * 60 * 60 * 24));
  if (diffDays <= WARNING_WINDOW_DAYS) return StatusObrigacaoContabil.VENCENDO;
  return StatusObrigacaoContabil.EM_DIA;
}

export function nextDueDate(current: Date, periodicidade: PeriodicidadeObrigacao): Date {
  const next = new Date(current);
  if (periodicidade === PeriodicidadeObrigacao.MENSAL) {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (periodicidade === PeriodicidadeObrigacao.ANUAL) {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  return next;
}

export function defaultPeriodicidadeFromTipo(tipo: TipoObrigacaoContabil): PeriodicidadeObrigacao {
  switch (tipo) {
    case TipoObrigacaoContabil.PGDAS:
      return PeriodicidadeObrigacao.MENSAL;
    case TipoObrigacaoContabil.OUTRO:
      return PeriodicidadeObrigacao.UNICA;
    default:
      return PeriodicidadeObrigacao.ANUAL;
  }
}

export function normalizeStatus(
  requestedStatus: StatusObrigacaoContabil | undefined,
  dueDate: Date
): StatusObrigacaoContabil {
  if (requestedStatus === StatusObrigacaoContabil.CONCLUIDO) {
    return StatusObrigacaoContabil.CONCLUIDO;
  }
  return calculateObrigacaoStatus(dueDate);
}
