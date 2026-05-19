-- AlterTable: add convidadoEmail to Servico
ALTER TABLE "Servico" ADD COLUMN "convidadoEmail" TEXT;

-- CreateTable: CampoHist
CREATE TABLE "CampoHist" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "idAutor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampoHist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampoHist_servicoId_createdAt_idx" ON "CampoHist"("servicoId", "createdAt");

-- AddForeignKey
ALTER TABLE "CampoHist" ADD CONSTRAINT "CampoHist_servicoId_fkey"
    FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ServicoEventoHist
CREATE TABLE "ServicoEventoHist" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "googleEventId" TEXT,
    "dataAgendamento" TIMESTAMP(3) NOT NULL,
    "convidadoEmail" TEXT,
    "arquivadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServicoEventoHist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicoEventoHist_servicoId_arquivadoEm_idx" ON "ServicoEventoHist"("servicoId", "arquivadoEm");

-- AddForeignKey
ALTER TABLE "ServicoEventoHist" ADD CONSTRAINT "ServicoEventoHist_servicoId_fkey"
    FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
