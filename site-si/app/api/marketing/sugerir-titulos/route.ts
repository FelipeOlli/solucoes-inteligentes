import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, badRequest } from "@/lib/api-response";
import { brl } from "@/lib/format";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extrairMeta(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  return (re.exec(html) ?? re2.exec(html))?.[1]?.trim() ?? "";
}

function extrairTitle(html: string): string {
  return /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
}

async function lerPagina(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const ogTitle = extrairMeta(html, "og:title");
    const ogDesc = extrairMeta(html, "og:description");
    const title = extrairTitle(html);
    const partes = [
      ogTitle ? "Título da página: " + ogTitle : (title ? "Título da página: " + title : ""),
      ogDesc ? "Descrição: " + ogDesc.slice(0, 400) : "",
    ].filter(Boolean);
    return partes.length ? partes.join("\n") : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const body = await request.json().catch(() => ({}));
  const { titulo, link, precoDe, precoPor } = body as Record<string, string | undefined>;

  if (!precoPor) return badRequest("precoPor é obrigatório.");

  const nDe = precoDe ? Number(String(precoDe).replace(",", ".")) : NaN;
  const nPor = Number(String(precoPor).replace(",", "."));
  const desconto = !isNaN(nDe) && nDe > 0 ? Math.round((1 - nPor / nDe) * 100) + "%" : null;

  const conteudoPagina = link ? await lerPagina(link) : "";

  const contexto = [
    titulo ? "Nome cru do produto: " + titulo : "",
    conteudoPagina || (link ? "Link da oferta: " + link : ""),
    !isNaN(nDe) && nDe > 0 ? "Preço original: " + brl(nDe) : "",
    "Preço atual: " + brl(nPor),
    desconto ? "Desconto: " + desconto : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Você é um especialista em copywriting brasileiro no estilo anti-hype de Ícaro de Carvalho e Leandro Ladeira.

Crie 3 títulos fortes para um Story de Instagram de oferta de produto tech/eletrônico da empresa "Soluções Inteligentes".

CONTEXTO DA OFERTA:
${contexto}

REGRAS OBRIGATÓRIAS (siga à risca):
- Zero exclamação. Ponto final é mais forte que exclamação.
- Zero hype: sem "IMPERDÍVEL", "INCRÍVEL", "APROVEITE", "NÃO PERCA".
- Zero emoji.
- Frases curtas e diretas. Máximo 2 frases por título.
- Especificidade vence generalidade: use o nome real do produto, o desconto real, o preço real.
- Ângulo de benefício concreto (o que o produto faz pela pessoa), não feature técnica solta.
- Tom de quem entende de tech e fala com quem também entende — não vendedor de calçada.
- Máximo 70 caracteres por título (vai aparecer numa arte de Story, espaço é limitado).

EXEMPLOS do tom certo (adapte para o produto em questão):
- "SSD 1TB por R$ 329. Seu PC nunca mais vai travar."
- "Mesa com regulagem de altura. Metade do preço original."
- "O fone que cancela reunião e vizinho. R$ 179."

FORMATO DE RESPOSTA — responda APENAS com JSON válido, sem texto antes ou depois, sem markdown:
{"titulos":["título 1","título 2","título 3"]}`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const texto = msg.content.find((b) => b.type === "text")?.text ?? "";
    const clean = texto.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { titulos?: string[] };
    const titulos = parsed.titulos ?? [];

    if (!titulos.length) throw new Error("Resposta sem títulos.");

    return jsonResponse({ titulos, _paginaInfo: conteudoPagina || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return jsonResponse({ error: msg }, 502);
  }
}
