-- AlterEnum: ADD VALUE só funciona fora de transação no PostgreSQL
ALTER TYPE "StatusPagamentoFiscal" ADD VALUE 'NAO_APLICAVEL';

-- Reclassificar documentos existentes do tipo informativo que ainda estão PENDENTE
UPDATE "DocumentoFiscal"
  SET "statusPagamento" = 'NAO_APLICAVEL'
  WHERE "statusPagamento" = 'PENDENTE'
    AND "tipoDocumento" IN ('PGDAS_D_RECIBO', 'DEFIS_RECIBO', 'RELATORIO_SITUACAO', 'NOTIFICACAO_MAED');
