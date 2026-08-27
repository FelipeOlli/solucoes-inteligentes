// Formatação pt-BR compartilhada — evita reimplementar Intl.NumberFormat
// espalhado pelo projeto (foi assim que app/dashboard/page.tsx e o detalhe
// do serviço ficaram sem o `style: "currency"` em alguns pontos).

/** Formata um valor em Real: "R$ 1.234,56". `null`/`undefined`/NaN viram "—". */
export function brl(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata um percentual já em base 100 (ex: 5.5 → "5,50%"). */
export function pct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(2).replace(".", ",") + "%";
}
