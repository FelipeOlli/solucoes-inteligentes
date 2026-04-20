export type PendenciaRelatorio = {
  tipo: "PGDAS_D" | "MAED" | "OUTRO";
  competencia: Date | null;
  observacao: string;
};

export type RelatorioSituacaoExtraido = {
  cnpj: string | null;
  dataEmissao: Date | null;
  pendencias: PendenciaRelatorio[];
  confidence: number;
};

function parseMesAno(texto: string): Date | null {
  const m = texto.match(/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(`${m[2]}-${m[1]}-01`);
}

function parseData(texto: string): Date | null {
  const m = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`);
}

export function extrairRelatorioSituacao(texto: string): RelatorioSituacaoExtraido {
  let found = 0;
  const pendencias: PendenciaRelatorio[] = [];

  const cnpjMatch = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  const cnpj = cnpjMatch ? cnpjMatch[0] : null;
  if (cnpj) found++;

  const dtMatch = texto.match(/(?:Data de Emissão|Emitido em)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
  const dataEmissao = dtMatch ? parseData(dtMatch[1]) : null;
  if (dataEmissao) found++;

  // Omissões de PGDAS-D: linhas com competências MM/AAAA na seção de omissão
  const omissaoSection = texto.match(/Omiss[aã]o[\s\S]*?(?=Pend[eê]ncia|Processo|$)/i);
  if (omissaoSection) {
    const competencias = omissaoSection[0].matchAll(/(\d{2}\/\d{4})/g);
    for (const c of competencias) {
      const comp = parseMesAno(c[1]);
      if (comp) {
        pendencias.push({ tipo: "PGDAS_D", competencia: comp, observacao: `PGDAS-D omisso ${c[1]}` });
      }
    }
    if (pendencias.length > 0) found++;
  }

  // Débitos SIEF: seção com débitos de MAED
  const siefSection = texto.match(/D[eé]bito[\s\S]*?SIEF[\s\S]*?(?=Processo|Omiss|$)/i);
  if (siefSection) {
    const paMatches = siefSection[0].matchAll(/(\d{2}\/\d{4})/g);
    for (const pa of paMatches) {
      const comp = parseMesAno(pa[1]);
      if (comp) {
        pendencias.push({ tipo: "MAED", competencia: comp, observacao: `Débito SIEF ${pa[1]}` });
      }
    }
  }

  return { cnpj, dataEmissao, pendencias, confidence: found / 3 };
}
