-- CreateTable
CREATE TABLE "ArtigoConhecimento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "descricao" TEXT,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtigoConhecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnexoConhecimento" (
    "id" TEXT NOT NULL,
    "artigoId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoConhecimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtigoConhecimento_categoria_idx" ON "ArtigoConhecimento"("categoria");

-- CreateIndex
CREATE INDEX "ArtigoConhecimento_ativo_idx" ON "ArtigoConhecimento"("ativo");

-- CreateIndex
CREATE INDEX "AnexoConhecimento_artigoId_idx" ON "AnexoConhecimento"("artigoId");

-- AddForeignKey
ALTER TABLE "AnexoConhecimento" ADD CONSTRAINT "AnexoConhecimento_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "ArtigoConhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
