-- CreateTable
CREATE TABLE "ChaveMcp" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3),
    "revogadaEm" TIMESTAMP(3),

    CONSTRAINT "ChaveMcp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChaveMcp_hash_key" ON "ChaveMcp"("hash");
