-- AlterTable: proposta de reagendamento feita pelo técnico, aguardando
-- aprovação do dono (status AGUARDANDO_REAGENDAMENTO)
ALTER TABLE "Servico" ADD COLUMN "dataReagendamentoProposta" TIMESTAMP(3);
ALTER TABLE "Servico" ADD COLUMN "motivoReagendamento"       TEXT;
