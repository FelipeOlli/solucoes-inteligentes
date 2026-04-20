import { TipoDocumentoFiscal } from "@prisma/client";

export function detectarTipo(texto: string): TipoDocumentoFiscal {
  if (/Documento de Arrecada[çc][aã]o do Simples Nacional/i.test(texto)) {
    return TipoDocumentoFiscal.DAS;
  }
  if (/DARF/i.test(texto) && /4406/.test(texto)) {
    return TipoDocumentoFiscal.DARF_MAED;
  }
  if (/Recibo de Entrega[\s\S]*PGDAS/i.test(texto) || /PGDAS[\s\S]*Recibo de Entrega/i.test(texto)) {
    return TipoDocumentoFiscal.PGDAS_D_RECIBO;
  }
  if (/Declara[çc][aã]o de Informa[çc][oõ]es Socioecon[oô]micas/i.test(texto)) {
    return TipoDocumentoFiscal.DEFIS_RECIBO;
  }
  if (/NOTIFICA[ÇC][ÃA]O DE LAN[ÇC]AMENTO/i.test(texto)) {
    return TipoDocumentoFiscal.NOTIFICACAO_MAED;
  }
  if (
    /Diagn[oó]stico Fiscal/i.test(texto) ||
    /INFORMA[ÇC][OÕ]ES DE APOIO PARA EMISS[ÃA]O DE CERTID[ÃA]O/i.test(texto)
  ) {
    return TipoDocumentoFiscal.RELATORIO_SITUACAO;
  }
  return TipoDocumentoFiscal.OUTROS;
}
