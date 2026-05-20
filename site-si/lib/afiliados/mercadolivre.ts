import type { ProdutoBusca } from "./types";

const ML_API = "https://api.mercadolibre.com";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getMLAccessToken(): Promise<string | null> {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (cachedToken && tokenExpiresAt - now > 10 * 60 * 1000) return cachedToken;

  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[ML] OAuth falhou (${res.status}):`, body);
    return null;
  }

  const json = await res.json();
  cachedToken = json.access_token;
  tokenExpiresAt = now + (json.expires_in ?? 21600) * 1000;
  return cachedToken;
}

function aplicarTagML(url: string): string {
  const tag = process.env.ML_AFFILIATE_TAG;
  if (!tag) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("matt_word", tag);
    const tool = process.env.ML_AFFILIATE_TOOL;
    if (tool) u.searchParams.set("matt_tool", tool);
    return u.toString();
  } catch {
    return url;
  }
}

type MLItem = {
  id: string | number;
  title: string;
  price: number | null;
  thumbnail: string | null;
  permalink: string;
};

export async function buscarML(termo: string): Promise<ProdutoBusca[]> {
  const searchUrl = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=20`;

  // Tenta sem token primeiro; se retornar 401, tenta com OAuth
  async function doSearch(token: string | null): Promise<Response> {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    return fetch(searchUrl, { cache: "no-store", headers });
  }

  let res = await doSearch(null);

  if (res.status === 401 || res.status === 403) {
    console.log("[ML] busca sem token retornou", res.status, "— tentando com OAuth...");
    const token = await getMLAccessToken();
    res = await doSearch(token);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML search (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  console.log(`[ML] busca "${termo}" → ${json.results?.length ?? 0} resultados`);

  return (json.results ?? []).map((item: MLItem): ProdutoBusca => {
    const urlOriginal = item.permalink;
    return {
      marketplace: "ML",
      externalId: String(item.id),
      titulo: item.title,
      imagemUrl: item.thumbnail ? item.thumbnail.replace("http://", "https://") : null,
      preco: item.price ?? null,
      urlOriginal,
      urlAfiliado: aplicarTagML(urlOriginal),
    };
  });
}
