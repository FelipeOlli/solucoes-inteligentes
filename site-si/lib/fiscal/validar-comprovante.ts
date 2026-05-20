import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { parsePdfBuffer } from "./pdf-parser";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ItemValidacao = {
  campo: string;
  esperado: string | null;
  encontrado: string | null;
  ok: boolean;
};

export type ValidacaoComprovante = {
  status: "CONFERE" | "DIVERGENCIA" | "INCONCLUSIVO";
  itens: ItemValidacao[];
  resumo: string;
  processadoEm: string;
};

function formatBrl(valor: unknown): string | null {
  if (valor == null) return null;
  const n = parseFloat(String(valor));
  if (isNaN(n)) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatData(iso: unknown): string | null {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function extrairJson(texto: string): string {
  const match = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return texto.trim();
}

type DocInfo = {
  tipo: string;
  valorTotal: unknown;
  vencimento: unknown;
  numeroDocumento: unknown;
};

const PROMPT_SISTEMA = `Você é um especialista em documentos fiscais brasileiros.
Analise o comprovante de pagamento e verifique se ele corresponde ao boleto/guia informado.
Retorne APENAS um JSON válido, sem markdown, sem explicação.

Formato de saída:
{
  "status": "CONFERE" | "DIVERGENCIA" | "INCONCLUSIVO",
  "itens": [
    { "campo": "Valor", "esperado": "R$ 171,96", "encontrado": "R$ 171,96", "ok": true },
    { "campo": "Data de pagamento", "esperado": "vencimento 19/05/2026", "encontrado": "18/05/2026", "ok": true },
    { "campo": "Nº Documento", "esperado": "07.20.26140.7035782-5", "encontrado": "07.20.26140.7035782-5", "ok": true }
  ],
  "resumo": "Comprovante confere com o boleto DAS de R$ 171,96."
}

Regras:
- "CONFERE": todos os campos verificáveis estão corretos
- "DIVERGENCIA": pelo menos um campo verificável está diferente
- "INCONCLUSIVO": não é possível confirmar (comprovante ilegível, tipo diferente, campos ausentes)
- Para "Data de pagamento": ok=true se a data encontrada for <= vencimento
- Se um campo não constar no comprovante, use encontrado: null e ok: false`;

export async function validarComprovante(
  buffer: Buffer,
  mimeType: string,
  doc: DocInfo
): Promise<ValidacaoComprovante> {
  try {
    const contextDoc = [
      `Tipo: ${doc.tipo}`,
      `Valor: ${formatBrl(doc.valorTotal) ?? "não informado"}`,
      `Vencimento: ${formatData(doc.vencimento) ?? "não informado"}`,
      `Nº Documento: ${doc.numeroDocumento ?? "não informado"}`,
    ].join("\n");

    let conteudoComprovante: Anthropic.MessageParam["content"];

    if (mimeType === "application/pdf") {
      const { text } = await parsePdfBuffer(buffer);
      conteudoComprovante = `Texto do comprovante (PDF):\n${text.slice(0, 8000)}`;
    } else {
      // Redimensiona pra max 1568px (recomendação Anthropic) e recodifica JPEG 85% pra reduzir payload
      const otimizado = await sharp(buffer)
        .rotate()
        .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      conteudoComprovante = [
        {
          type: "text" as const,
          text: "Comprovante de pagamento (imagem):",
        },
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/jpeg",
            data: otimizado.toString("base64"),
          },
        },
      ];
    }

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Dados do boleto/guia:\n${contextDoc}\n\n`,
            },
            ...(Array.isArray(conteudoComprovante)
              ? conteudoComprovante
              : [{ type: "text" as const, text: conteudoComprovante as string }]),
          ],
        },
      ],
    });

    if (msg.stop_reason === "max_tokens") {
      return {
        status: "INCONCLUSIVO",
        itens: [],
        resumo: "Resposta cortada por limite de tokens.",
        processadoEm: new Date().toISOString(),
      };
    }

    const texto = msg.content[0].type === "text" ? msg.content[0].text : "";
    try {
      const parsed = JSON.parse(extrairJson(texto)) as ValidacaoComprovante;
      return {
        status: parsed.status ?? "INCONCLUSIVO",
        itens: parsed.itens ?? [],
        resumo: parsed.resumo ?? "",
        processadoEm: new Date().toISOString(),
      };
    } catch {
      return {
        status: "INCONCLUSIVO",
        itens: [],
        resumo: `Resposta inesperada do modelo: ${texto.slice(0, 200)}`,
        processadoEm: new Date().toISOString(),
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[validarComprovante] erro:", err);
    return {
      status: "INCONCLUSIVO",
      itens: [],
      resumo: `Erro na validação: ${msg.slice(0, 200)}`,
      processadoEm: new Date().toISOString(),
    };
  }
}
