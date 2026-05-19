-- CreateTable
CREATE TABLE "ProdutoAfiliado" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "preco" DECIMAL(10,2),
    "urlOriginal" TEXT NOT NULL,
    "urlAfiliado" TEXT NOT NULL,
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProdutoAfiliado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoAfiliado_marketplace_externalId_key" ON "ProdutoAfiliado"("marketplace", "externalId");

-- CreateIndex
CREATE INDEX "ProdutoAfiliado_titulo_idx" ON "ProdutoAfiliado"("titulo");
