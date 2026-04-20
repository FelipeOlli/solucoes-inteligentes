import {
  calcularConfianca,
  extractCampo,
  extractCnpj,
  extractData,
  extractMesAno,
  extractRazaoSocial,
} from "./utils";

export type PgdasReciboExtraido = {
  cnpj: string | null;
  razaoSocial: string | null;
  competencia: Date | null;
  dataTransmissao: Date | null;
  numeroRecibo: string | null;
  confidence: number;
};

export function extrairPgdasRecibo(texto: string): PgdasReciboExtraido {
  const cnpj = extractCnpj(texto);
  const razaoSocial = extractRazaoSocial(texto);

  const competencia = extractMesAno(texto, [
    "Período de Apuração",
    "Periodo de Apuracao",
    "PA",
    "Competência",
    "Mês de Referência",
  ]);

  const dataTransmissao = extractData(texto, [
    "Data de Transmissão",
    "Data/Hora",
    "Transmitido em",
    "Data e Hora",
    "Data da Transmissão",
  ]);

  const numeroRecibo = extractCampo(texto, [
    "Número do Recibo",
    "Nº do Recibo",
    "Nº Recibo",
    "Numero do Recibo",
    "Recibo",
  ]);

  // Para PGDAS-D recibo, competência e recibo têm peso de "vencimento" e "valor"
  const confidence = calcularConfianca({
    cnpj,
    razaoSocial,
    competencia,
    vencimento: dataTransmissao,
    valor: numeroRecibo,
  });

  return { cnpj, razaoSocial, competencia, dataTransmissao, numeroRecibo, confidence };
}
