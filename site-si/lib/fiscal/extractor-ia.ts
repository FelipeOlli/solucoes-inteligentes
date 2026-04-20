import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DadosExtradosIA = {
  tipo: string;
  cnpj: string | null;
  razaoSocial: string | null;
  competencia: string | null;   // formato YYYY-MM-DD (dia 01)
  vencimento: string | null;    // formato YYYY-MM-DD
  valorTotal: number | null;
  numeroDocumento: string | null;
  observacoes: string | null;
  confidence: number;           // 0..1 estimado pelo modelo
};

const PROMPT_SISTEMA = `Você é um especialista em documentos fiscais brasileiros.
Analise o texto extraído de um PDF fiscal e retorne um JSON com os campos abaixo.
Retorne APENAS o JSON, sem markdown, sem explicação.

Tipos de documento possíveis:
- DAS: Documento de Arrecadação do Simples Nacional
- DARF_MAED: DARF com código 4406 (multa por atraso na declaração)
- PGDAS_D_RECIBO: Recibo de entrega do PGDAS-D
- DEFIS_RECIBO: Recibo de entrega da DEFIS
- NOTIFICACAO_MAED: Notificação de lançamento de multa
- RELATORIO_SITUACAO: Relatório/Diagnóstico de situação fiscal
- OUTROS: Qualquer outro documento

Formato de saída:
{
  "tipo": "DAS|DARF_MAED|PGDAS_D_RECIBO|DEFIS_RECIBO|NOTIFICACAO_MAED|RELATORIO_SITUACAO|OUTROS",
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "razaoSocial": "nome da empresa ou null",
  "competencia": "YYYY-MM-01 (mês de referência) ou null",
  "vencimento": "YYYY-MM-DD ou null",
  "valorTotal": número decimal ou null,
  "numeroDocumento": "número do documento/recibo ou null",
  "observacoes": "informações adicionais relevantes ou null",
  "confidence": número entre 0 e 1 indicando sua confiança na extração
}`;

function extrairJson(conteudo: string): string {
  // Tenta extrair JSON de bloco markdown ```json ... ``` se o modelo ignorar a instrução
  const match = conteudo.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return conteudo.trim();
}

export async function extrairComIA(texto: string): Promise<DadosExtradosIA> {
  const textoLimitado = texto.slice(0, 12000);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Texto do PDF:\n\n${textoLimitado}`,
      },
    ],
    system: PROMPT_SISTEMA,
  });

  // Se o modelo foi cortado por max_tokens, o JSON está incompleto — não tenta parsear
  if (msg.stop_reason === "max_tokens") {
    return {
      tipo: "OUTROS",
      cnpj: null,
      razaoSocial: null,
      competencia: null,
      vencimento: null,
      valorTotal: null,
      numeroDocumento: null,
      observacoes: "Resposta cortada por limite de tokens.",
      confidence: 0,
    };
  }

  const conteudo = msg.content[0].type === "text" ? msg.content[0].text : "";

  try {
    const jsonStr = extrairJson(conteudo);
    const dados = JSON.parse(jsonStr) as DadosExtradosIA;
    dados.confidence = Math.min(1, Math.max(0, dados.confidence ?? 0.8));
    return dados;
  } catch {
    return {
      tipo: "OUTROS",
      cnpj: null,
      razaoSocial: null,
      competencia: null,
      vencimento: null,
      valorTotal: null,
      numeroDocumento: null,
      observacoes: conteudo.slice(0, 200),
      confidence: 0,
    };
  }
}
