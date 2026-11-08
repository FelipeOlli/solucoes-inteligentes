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

/**
 * Quebra a descrição (muitas vezes colada do WhatsApp, tudo numa linha) em
 * linhas legíveis: respeita \n e abre linha nova antes de cada ✅ e •.
 */
export function linhasDescricao(texto: string): string[] {
  return texto
    .replace(/\r/g, "")
    .replace(/\s*(✅|•)\s*/g, "\n$1 ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Link de busca no Google Maps para o endereço (do serviço, ou do cadastro do cliente). */
export function linkGoogleMaps(
  enderecoServico: string | null | undefined,
  cliente: { logradouro?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null }
): string | null {
  const partes = enderecoServico?.trim()
    ? [enderecoServico.trim()]
    : [cliente.logradouro, cliente.bairro, cliente.cidade, cliente.uf, cliente.cep];
  const query = partes.map((p) => p?.trim()).filter(Boolean).join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
