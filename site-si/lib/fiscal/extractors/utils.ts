/**
 * Helpers compartilhados para extração de campos dos PDFs fiscais.
 * Todos os métodos aceitam texto cru extraído pelo pdf-parse.
 */

// ─── CNPJ ────────────────────────────────────────────────────────────────────

export function extractCnpj(texto: string): string | null {
  const m = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  return m ? m[0] : null;
}

// ─── Razão Social ─────────────────────────────────────────────────────────────

export function extractRazaoSocial(texto: string): string | null {
  // Padrões com label explícito (mais confiáveis)
  const labelsRazao = [
    /Raz[aã]o\s+Social\s*[:\-]\s*([^\n\r]{3,80})/i,
    /Nome\s+Empresarial\s*[:\-]\s*([^\n\r]{3,80})/i,
    /Contribuinte\s*[:\-]\s*([^\n\r]{3,80})/i,
    /Empresa\s*[:\-]\s*([^\n\r]{3,80})/i,
  ];

  for (const re of labelsRazao) {
    const m = texto.match(re);
    if (m) {
      const valor = m[1].trim().replace(/\s+/g, " ");
      // Descarta se parece ser CNPJ ou número
      if (valor && !/^\d/.test(valor) && valor.length >= 3) return valor;
    }
  }

  // Fallback: linha imediatamente após o CNPJ que pareça nome de empresa
  const cnpj = extractCnpj(texto);
  if (cnpj) {
    const idx = texto.indexOf(cnpj);
    if (idx !== -1) {
      const apos = texto.slice(idx + cnpj.length);
      const linhas = apos.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
      for (const linha of linhas.slice(0, 3)) {
        // Linha com pelo menos 3 palavras, sem números no início, não parece data/valor
        if (
          linha.length >= 5 &&
          !/^\d/.test(linha) &&
          !/^\s*(CPF|CNPJ|IE|CEP|Rua|Av\.|Bairro|Endereço)/i.test(linha) &&
          /[A-ZÀ-Ú]{2,}/i.test(linha)
        ) {
          return linha.replace(/\s+/g, " ").slice(0, 80);
        }
      }
    }
  }

  return null;
}

// ─── Datas ────────────────────────────────────────────────────────────────────

function parseDataBr(s: string): Date | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return isNaN(d.getTime()) ? null : d;
}

function parseMesAnoBr(s: string): Date | null {
  const m = s.match(/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[2]}-${m[1]}-01`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Procura a primeira data DD/MM/AAAA após qualquer um dos labels fornecidos.
 */
export function extractData(texto: string, labels: string[]): Date | null {
  const labelsEscapados = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:${labelsEscapados})\\s*[:\\-]?\\s*(\\d{2}\\/\\d{2}\\/\\d{4})`, "i");
  const m = texto.match(re);
  if (m) return parseDataBr(m[1]);

  // Fallback: busca data DD/MM/AAAA após label em linhas separadas
  for (const label of labels) {
    const idx = texto.search(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    if (idx === -1) continue;
    const trecho = texto.slice(idx, idx + 200);
    const dm = trecho.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dm) return parseDataBr(dm[0]);
  }
  return null;
}

/**
 * Procura mês/ano MM/AAAA após qualquer um dos labels fornecidos.
 */
export function extractMesAno(texto: string, labels: string[]): Date | null {
  const labelsEscapados = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:${labelsEscapados})\\s*[:\\-]?\\s*(\\d{2}\\/\\d{4})`, "i");
  const m = texto.match(re);
  if (m) return parseMesAnoBr(m[1]);

  for (const label of labels) {
    const idx = texto.search(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    if (idx === -1) continue;
    const trecho = texto.slice(idx, idx + 100);
    const dm = trecho.match(/(\d{2})\/(\d{4})/);
    if (dm) return parseMesAnoBr(dm[0]);
  }
  return null;
}

// ─── Valor monetário ──────────────────────────────────────────────────────────

function parseBrl(s: string): number | null {
  // Remove "R$", espaços e pontos de milhar, troca vírgula por ponto decimal
  const normalizado = s.replace(/R\$\s*/i, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(normalizado);
  return isNaN(n) || n <= 0 ? null : n;
}

/**
 * Procura valor monetário (R$ X.XXX,XX ou X.XXX,XX) após qualquer um dos labels.
 */
export function extractValor(texto: string, labels: string[]): number | null {
  const labelsEscapados = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(
    `(?:${labelsEscapados})\\s*[:\\-]?\\s*R?\\$?\\s*([\\d.,]+)`,
    "i"
  );
  const m = texto.match(re);
  if (m) {
    const v = parseBrl(m[1]);
    if (v !== null) return v;
  }

  // Fallback: busca R$ X.XXX,XX na vizinhança do label
  for (const label of labels) {
    const idx = texto.search(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    if (idx === -1) continue;
    const trecho = texto.slice(idx, idx + 200);
    const vm = trecho.match(/R?\$?\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/i);
    if (vm) {
      const v = parseBrl(vm[1]);
      if (v !== null) return v;
    }
  }
  return null;
}

// ─── Campo texto curto (nº documento, recibo etc.) ───────────────────────────

/**
 * Extrai texto curto (ex.: número de documento) após qualquer um dos labels.
 */
export function extractCampo(texto: string, labels: string[]): string | null {
  const labelsEscapados = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:${labelsEscapados})\\s*[:\\-]?\\s*([\\w./\\- ]{1,40})`, "i");
  const m = texto.match(re);
  if (m) return m[1].trim().split(/\s{2,}/)[0].trim() || null;
  return null;
}

// ─── Confiança ponderada ──────────────────────────────────────────────────────

export type CamposPesados = {
  cnpj: unknown;
  razaoSocial: unknown;
  competencia: unknown;
  vencimento: unknown;
  valor: unknown;
};

/**
 * Calcula confiança ponderada:
 * CNPJ 30% | Razão Social 20% | Competência/Período 20% | Vencimento 15% | Valor 15%
 */
export function calcularConfianca(campos: CamposPesados): number {
  const pesos = { cnpj: 0.30, razaoSocial: 0.20, competencia: 0.20, vencimento: 0.15, valor: 0.15 };
  let total = 0;
  if (campos.cnpj) total += pesos.cnpj;
  if (campos.razaoSocial) total += pesos.razaoSocial;
  if (campos.competencia) total += pesos.competencia;
  if (campos.vencimento) total += pesos.vencimento;
  if (campos.valor) total += pesos.valor;
  return Math.round(total * 100) / 100;
}
