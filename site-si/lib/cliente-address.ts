/** Extrai campos de endereço do body JSON (POST cliente ou cliente inline em serviço). Legado: `endereco` vira logradouro se logradouro vazio. */

export type ClienteAddressData = {
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export function parseClienteAddressFromBody(body: Record<string, unknown>): ClienteAddressData {
  let logradouro = trimOrNull(body.logradouro);
  if (!logradouro) logradouro = trimOrNull(body.endereco);
  const ufRaw = trimOrNull(body.uf);
  const uf = ufRaw ? ufRaw.toUpperCase().slice(0, 2) : null;
  return {
    logradouro,
    bairro: trimOrNull(body.bairro),
    cidade: trimOrNull(body.cidade),
    uf,
    cep: trimOrNull(body.cep),
  };
}
