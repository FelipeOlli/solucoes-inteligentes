import type { ProdutoBusca } from "./types";
import { getMLToken } from "./ml-auth";

const ML_API = "https://api.mercadolibre.com";

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
  const token = await getMLToken();
  const url = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=20`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML search (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  console.log(`[ML] "${termo}" → ${json.results?.length ?? 0} resultados`);

  return (json.results ?? []).map((item: MLItem): ProdutoBusca => ({
    marketplace: "ML",
    externalId: String(item.id),
    titulo: item.title,
    imagemUrl: item.thumbnail ? item.thumbnail.replace("http://", "https://") : null,
    preco: item.price ?? null,
    urlOriginal: item.permalink,
    urlAfiliado: aplicarTagML(item.permalink),
  }));
}
