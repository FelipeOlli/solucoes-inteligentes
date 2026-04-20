import {
  calcularConfianca,
  extractCampo,
  extractCnpj,
  extractData,
  extractMesAno,
  extractRazaoSocial,
  extractValor,
} from "./utils";

export type DarfMaedExtraido = {
  cnpj: string | null;
  razaoSocial: string | null;
  periodoApuracao: Date | null;
  vencimento: Date | null;
  valorTotal: number | null;
  numeroDocumento: string | null;
  confidence: number;
};

export function extrairDarfMaed(texto: string): DarfMaedExtraido {
  const cnpj = extractCnpj(texto);
  const razaoSocial = extractRazaoSocial(texto);

  const periodoApuracao = extractMesAno(texto, [
    "Período de Apuração",
    "Periodo de Apuracao",
    "PA",
    "Competência",
  ]);

  const vencimento = extractData(texto, [
    "Data de Vencimento",
    "Vencimento",
    "Data Vencimento",
  ]);

  const valorTotal = extractValor(texto, [
    "Valor Total",
    "Total",
    "Valor Principal",
    "Valor do Documento",
    "Valor a Recolher",
  ]);

  const numeroDocumento = extractCampo(texto, [
    "Número do Documento",
    "Nº do Documento",
    "Numero do Documento",
    "No do Documento",
    "Autenticação",
  ]);

  const confidence = calcularConfianca({ cnpj, razaoSocial, competencia: periodoApuracao, vencimento, valor: valorTotal });

  return { cnpj, razaoSocial, periodoApuracao, vencimento, valorTotal, numeroDocumento, confidence };
}
