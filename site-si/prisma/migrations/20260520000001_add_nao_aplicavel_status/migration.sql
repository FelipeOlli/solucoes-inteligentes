-- Recriar o enum com o novo valor (única forma de funcionar dentro de transação no PostgreSQL)
ALTER TABLE "DocumentoFiscal" ALTER COLUMN "statusPagamento" DROP DEFAULT;

ALTER TABLE "DocumentoFiscal"
  ALTER COLUMN "statusPagamento" TYPE TEXT;

DROP TYPE "StatusPagamentoFiscal";

CREATE TYPE "StatusPagamentoFiscal" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'ISENTO', 'NAO_APLICAVEL');

ALTER TABLE "DocumentoFiscal"
  ALTER COLUMN "statusPagamento" TYPE "StatusPagamentoFiscal"
  USING "statusPagamento"::"StatusPagamentoFiscal";

ALTER TABLE "DocumentoFiscal"
  ALTER COLUMN "statusPagamento" SET DEFAULT 'PENDENTE'::"StatusPagamentoFiscal";

-- Reclassificar documentos informativos existentes
UPDATE "DocumentoFiscal"
  SET "statusPagamento" = 'NAO_APLICAVEL'
  WHERE "statusPagamento" = 'PENDENTE'
    AND "tipoDocumento" IN ('PGDAS_D_RECIBO', 'DEFIS_RECIBO', 'RELATORIO_SITUACAO', 'NOTIFICACAO_MAED');
