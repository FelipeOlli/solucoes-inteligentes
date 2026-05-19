import type { ProdutoBusca } from "./types";

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
  const url = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=20`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ML API ${res.status}`);
  const json = await res.json();

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
