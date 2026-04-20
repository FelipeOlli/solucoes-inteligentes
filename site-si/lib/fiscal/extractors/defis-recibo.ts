import {
  calcularConfianca,
  extractCampo,
  extractCnpj,
  extractData,
  extractRazaoSocial,
} from "./utils";

export type DefisReciboExtraido = {
  cnpj: string | null;
  razaoSocial: string | null;
  anoCalendario: number | null;
  dataTransmissao: Date | null;
  numeroRecibo: string | null;
  confidence: number;
};

function extractAnoCalendario(texto: string): number | null {
  const labels = ["Ano-Calendário", "Ano Calendário", "Ano de Referência", "Ano"];
  for (const label of labels) {
    const re = new RegExp(
      label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?\\s*(\\d{4})",
      "i"
    );
    const m = texto.match(re);
    if (m) {
      const ano = parseInt(m[1]);
      if (ano >= 2000 && ano <= 2100) return ano;
    }
  }
  return null;
}

export function extrairDefisRecibo(texto: string): DefisReciboExtraido {
  const cnpj = extractCnpj(texto);
  const razaoSocial = extractRazaoSocial(texto);
  const anoCalendario = extractAnoCalendario(texto);

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

  const competenciaProxy = anoCalendario ? new Date(`${anoCalendario}-01-01`) : null;

  const confidence = calcularConfianca({
    cnpj,
    razaoSocial,
    competencia: competenciaProxy,
    vencimento: dataTransmissao,
    valor: numeroRecibo,
  });

  return { cnpj, razaoSocial, anoCalendario, dataTransmissao, numeroRecibo, confidence };
}
