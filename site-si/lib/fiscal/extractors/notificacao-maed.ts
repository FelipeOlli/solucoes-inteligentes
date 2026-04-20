import {
  calcularConfianca,
  extractCampo,
  extractCnpj,
  extractData,
  extractMesAno,
  extractRazaoSocial,
  extractValor,
} from "./utils";

export type NotificacaoMaedExtraida = {
  cnpj: string | null;
  razaoSocial: string | null;
  periodoApuracao: Date | null;
  vencimento: Date | null;
  valorMulta: number | null;
  numeroNotificacao: string | null;
  confidence: number;
};

export function extrairNotificacaoMaed(texto: string): NotificacaoMaedExtraida {
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
    "Prazo para Pagamento",
    "Prazo de Pagamento",
    "Prazo",
  ]);

  const valorMulta = extractValor(texto, [
    "Valor da Multa",
    "Multa",
    "Valor Total",
    "Total",
    "Valor a Pagar",
  ]);

  const numeroNotificacao = extractCampo(texto, [
    "Número da Notificação",
    "Nº da Notificação",
    "Nº Notificação",
    "Numero da Notificacao",
    "Notificação",
  ]);

  const confidence = calcularConfianca({
    cnpj,
    razaoSocial,
    competencia: periodoApuracao,
    vencimento,
    valor: valorMulta,
  });

  return { cnpj, razaoSocial, periodoApuracao, vencimento, valorMulta, numeroNotificacao, confidence };
}
