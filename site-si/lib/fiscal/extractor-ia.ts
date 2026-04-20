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

export async function extrairComIA(texto: string): Promise<DadosExtradosIA> {
  // Limita o texto para não extrapolar tokens desnecessariamente
  const textoLimitado = texto.slice(0, 8000);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Texto do PDF:\n\n${textoLimitado}`,
      },
    ],
    system: PROMPT_SISTEMA,
  });

  const conteudo = msg.content[0].type === "text" ? msg.content[0].text : "";

  try {
    const dados = JSON.parse(conteudo) as DadosExtradosIA;
    // Garante que confidence está entre 0 e 1
    dados.confidence = Math.min(1, Math.max(0, dados.confidence ?? 0.8));
    return dados;
  } catch {
    // Se o modelo retornou algo inesperado
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
