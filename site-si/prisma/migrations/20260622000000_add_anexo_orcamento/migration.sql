-- CreateEnum
CREATE TYPE "CategoriaAnexoOrcamento" AS ENUM ('MODELO', 'CARIMBO');

-- CreateEnum
CREATE TYPE "TipoCarimbo" AS ENUM ('PIX', 'CARTAO_CREDITO', 'CHEQUE');

-- CreateTable
CREATE TABLE "AnexoOrcamento" (
    "id"           TEXT NOT NULL,
    "categoria"    "CategoriaAnexoOrcamento" NOT NULL,
    "rotulo"       TEXT NOT NULL,
    "tipoCarimbo"  "TipoCarimbo",
    "nomeArquivo"  TEXT NOT NULL,
    "url"          TEXT NOT NULL,
    "mimeType"     TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnexoOrcamento_categoria_idx" ON "AnexoOrcamento"("categoria");
