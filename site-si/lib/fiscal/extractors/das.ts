import {
  calcularConfianca,
  extractCampo,
  extractCnpj,
  extractData,
  extractMesAno,
  extractRazaoSocial,
  extractValor,
} from "./utils";

export type DasExtraido = {
  cnpj: string | null;
  razaoSocial: string | null;
  competencia: Date | null;
  vencimento: Date | null;
  valorTotal: number | null;
  numeroDocumento: string | null;
  confidence: number;
};

export function extrairDas(texto: string): DasExtraido {
  const cnpj = extractCnpj(texto);
  const razaoSocial = extractRazaoSocial(texto);

  const competencia = extractMesAno(texto, [
    "Período de Apuração",
    "PA",
    "Competência",
    "Mês de Competência",
    "Periodo de Apuracao",
  ]);

  const vencimento = extractData(texto, [
    "Data de Vencimento",
    "Vencimento",
    "Venc.",
    "Data Vencimento",
  ]);

  const valorTotal = extractValor(texto, [
    "Valor do Documento",
    "Valor Total",
    "Total a Pagar",
    "Valor a Recolher",
    "Valor",
  ]);

  const numeroDocumento = extractCampo(texto, [
    "Número do Documento",
    "Nº do DAS",
    "Nº Documento",
    "Numero do Documento",
    "No do Documento",
  ]);

  const confidence = calcularConfianca({ cnpj, razaoSocial, competencia, vencimento, valor: valorTotal });

  return { cnpj, razaoSocial, competencia, vencimento, valorTotal, numeroDocumento, confidence };
}
