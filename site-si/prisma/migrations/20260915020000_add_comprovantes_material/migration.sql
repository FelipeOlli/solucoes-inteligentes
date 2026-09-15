-- AlterTable: comprovantes de material comprado, enviados pelo técnico
-- durante o atendimento (JSON array de URLs, mesmo formato de Servico.imagens)
ALTER TABLE "Servico" ADD COLUMN "comprovantesMaterial" TEXT;
