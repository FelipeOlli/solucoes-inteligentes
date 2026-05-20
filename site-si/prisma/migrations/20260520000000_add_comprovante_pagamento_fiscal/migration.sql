-- CreateEnum
CREATE TYPE "StatusPagamentoFiscal" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'ISENTO');

-- AlterTable
ALTER TABLE "DocumentoFiscal"
  ADD COLUMN "statusPagamento"         "StatusPagamentoFiscal" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "dataPagamento"           TIMESTAMP(3),
  ADD COLUMN "valorPago"               DECIMAL(12,2),
  ADD COLUMN "comprovanteUrl"          TEXT,
  ADD COLUMN "comprovanteNomeArquivo"  TEXT,
  ADD COLUMN "comprovanteTamanhoBytes" INTEGER,
  ADD COLUMN "comprovanteHash"         TEXT;

-- CreateIndex
CREATE INDEX "DocumentoFiscal_statusPagamento_idx" ON "DocumentoFiscal"("statusPagamento");
