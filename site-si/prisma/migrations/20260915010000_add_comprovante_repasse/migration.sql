-- AlterTable: comprovante do repasse pago ao técnico — obrigatório para
-- concluir serviços com repasse pendente (ver app/api/servicos/[id]/status)
ALTER TABLE "Servico" ADD COLUMN "comprovanteRepasseUrl"         TEXT;
ALTER TABLE "Servico" ADD COLUMN "comprovanteRepasseNomeArquivo" TEXT;
ALTER TABLE "Servico" ADD COLUMN "comprovanteRepasseEnviadoEm"   TIMESTAMP(3);
