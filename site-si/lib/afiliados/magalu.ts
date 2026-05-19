// FRÁGIL: extrai dados do __NEXT_DATA__ da página de busca do Magalu (SSR).
// Se o Magalu mudar o HTML ou estrutura interna, este módulo para de funcionar.
import * as cheerio from "cheerio";
import type { ProdutoBusca } from "./types";

function aplicarTagMagalu(url: string): string {
  const slug = process.env.MAGALU_AFFILIATE_SLUG;
  if (!slug) return url;
  try {
    const fullUrl = url.startsWith("http") ? url : `https://www.magazineluiza.com.br${url}`;
    const u = new URL(fullUrl);
    // Substitui domínio pela loja Magazine Você do afiliado
    const path = u.pathname + u.search;
    return `https://www.magazinevoce.com.br/${slug}${path}`;
  } catch {
    return url;
  }
}

type MagaluRawProduct = Record<string, unknown>;

function extrairProdutos(obj: unknown, depth = 0): MagaluRawProduct[] {
  if (depth > 6 || !obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const first = obj[0] as Record<string, unknown>;
      if ("title" in first || "sku" in first || "productId" in first || "product_id" in first) {
        return obj as MagaluRawProduct[];
      }
    }
    for (const item of obj) {
      const found = extrairProdutos(item, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }
  const record = obj as Record<string, unknown>;
  for (const key of ["products", "items", "results", "searchResult", "hits", "data"]) {
    if (record[key]) {
      const found = extrairProdutos(record[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  for (const val of Object.values(record)) {
    const found = extrairProdutos(val, depth + 1);
    if (found.length > 0) return found;
  }
  return [];
}

function parsePreco(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/[^\d,]/g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return parsePreco(r.best_price ?? r.price ?? r.sale_price ?? r.value ?? null);
  }
  return null;
}

function parseImagem(raw: unknown): string | null {
  if (typeof raw === "string" && raw.startsWith("http")) return raw;
  if (Array.isArray(raw) && raw.length > 0) return parseImagem(raw[0]);
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return parseImagem(r.url ?? r.src ?? r.imageUrl ?? r["0"] ?? null);
  }
  return null;
}

export async function buscarMagalu(termo: string): Promise<ProdutoBusca[]> {
  const termoUrl = encodeURIComponent(termo.toLowerCase().replace(/\s+/g, "-"));
  const url = `https://www.magazineluiza.com.br/busca/${termoUrl}/`;

  let html: string;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`Magalu HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    console.error("[magalu] fetch falhou:", e);
    return [];
  }

  try {
    const $ = cheerio.load(html);
    const nextDataEl = $("#__NEXT_DATA__").text().trim();
    if (!nextDataEl) throw new Error("__NEXT_DATA__ não encontrado");

    const nextData = JSON.parse(nextDataEl);
    const rawProducts = extrairProdutos(nextData?.props?.pageProps ?? nextData);
    if (rawProducts.length === 0) throw new Error("produtos não encontrados no JSON");

    return rawProducts.slice(0, 20).map((p, i): ProdutoBusca => {
      const titulo = String(p.title ?? p.name ?? p.product_name ?? `Produto ${i + 1}`);
      const preco = parsePreco(p.price ?? p.offers ?? p.selling_price ?? p.bestPrice ?? null);
      const imagemUrl = parseImagem(p.image ?? p.images ?? p.thumbnail ?? p.photo ?? null);
      const rawUrl = String(p.url ?? p.link ?? p.product_url ?? "");
      const urlOriginal = rawUrl.startsWith("http") ? rawUrl : `https://www.magazineluiza.com.br${rawUrl}`;
      const externalId = String(p.sku ?? p.productId ?? p.product_id ?? p.id ?? i);

      return {
        marketplace: "MAGALU",
        externalId,
        titulo,
        imagemUrl,
        preco,
        urlOriginal,
        urlAfiliado: aplicarTagMagalu(urlOriginal),
      };
    });
  } catch (e) {
    console.error("[magalu] parse falhou:", e);
    return [];
  }
}
