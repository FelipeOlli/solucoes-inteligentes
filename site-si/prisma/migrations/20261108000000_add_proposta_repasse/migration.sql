-- AlterTable: negociação do valor de repasse entre técnico e dono
ALTER TABLE "Servico" ADD COLUMN "repasseProposto"       DOUBLE PRECISION;
ALTER TABLE "Servico" ADD COLUMN "repassePropostoOrigem" TEXT;
ALTER TABLE "Servico" ADD COLUMN "repassePropostoObs"    TEXT;
