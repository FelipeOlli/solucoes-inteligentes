-- CreateTable
CREATE TABLE "VisitaTecnico" (
    "id"         TEXT NOT NULL,
    "servicoId"  TEXT NOT NULL,
    "tecnicoId"  TEXT NOT NULL,
    "inicioEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fimEm"      TIMESTAMP(3),
    "observacao" TEXT,

    CONSTRAINT "VisitaTecnico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitaTecnico_tecnicoId_inicioEm_idx" ON "VisitaTecnico"("tecnicoId", "inicioEm");

-- CreateIndex
CREATE INDEX "VisitaTecnico_servicoId_inicioEm_idx" ON "VisitaTecnico"("servicoId", "inicioEm");

-- AddForeignKey
ALTER TABLE "VisitaTecnico" ADD CONSTRAINT "VisitaTecnico_servicoId_fkey"
  FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaTecnico" ADD CONSTRAINT "VisitaTecnico_tecnicoId_fkey"
  FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
