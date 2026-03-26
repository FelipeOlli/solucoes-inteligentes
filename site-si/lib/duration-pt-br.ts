/** Texto "Aberto há …" a partir de data ISO (abertura do serviço) até `now` (default: Date.now()). */
export function formatDuracaoAbertaDesde(dataAberturaIso: string, nowMs = Date.now()): string {
  const start = new Date(dataAberturaIso).getTime();
  let diffMs = nowMs - start;
  if (Number.isNaN(diffMs) || diffMs < 0) diffMs = 0;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Aberto há menos de 1 minuto";

  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    return `Aberto há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (hours >= 1) {
    const h = hours;
    return `Aberto há ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  const m = minutes;
  return `Aberto há ${m} ${m === 1 ? "minuto" : "minutos"}`;
}
