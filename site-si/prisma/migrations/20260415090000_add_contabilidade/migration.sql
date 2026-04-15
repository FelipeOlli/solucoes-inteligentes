-- Contabilidade: obrigações, documentos e comentários

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoObrigacaoContabil') THEN
    CREATE TYPE "TipoObrigacaoContabil" AS ENUM ('DEFIS', 'PGDAS', 'RAIS_ESOCIAL', 'ALVARA', 'CERTIFICADO_DIGITAL', 'OUTRO');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PeriodicidadeObrigacao') THEN
    CREATE TYPE "PeriodicidadeObrigacao" AS ENUM ('MENSAL', 'ANUAL', 'UNICA');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusObrigacaoContabil') THEN
    CREATE TYPE "StatusObrigacaoContabil" AS ENUM ('PENDENTE', 'EM_DIA', 'VENCENDO', 'VENCIDO', 'CONCLUIDO');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoriaDocumentoContabil') THEN
    CREATE TYPE "CategoriaDocumentoContabil" AS ENUM ('BOLETO', 'COMPROVANTE', 'CERTIFICADO', 'OUTRO');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "ObrigacaoContabil" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" "TipoObrigacaoContabil" NOT NULL,
  "periodicidade" "PeriodicidadeObrigacao" NOT NULL,
  "proximoVencimento" TIMESTAMP(3) NOT NULL,
  "status" "StatusObrigacaoContabil" NOT NULL DEFAULT 'PENDENTE',
  "observacao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "calendarioEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ObrigacaoContabil_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ObrigacaoContabil_proximoVencimento_idx"
  ON "ObrigacaoContabil"("proximoVencimento");

CREATE INDEX IF NOT EXISTS "ObrigacaoContabil_status_proximoVencimento_idx"
  ON "ObrigacaoContabil"("status", "proximoVencimento");

CREATE TABLE IF NOT EXISTS "DocumentoContabil" (
  "id" TEXT NOT NULL,
  "obrigacaoId" TEXT NOT NULL,
  "categoria" "CategoriaDocumentoContabil" NOT NULL,
  "nomeOriginal" TEXT NOT NULL,
  "arquivoUrl" TEXT NOT NULL,
  "mimeType" TEXT,
  "tamanhoBytes" INTEGER,
  "competenciaRef" TEXT,
  "dataDocumento" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedBy" TEXT NOT NULL,
  CONSTRAINT "DocumentoContabil_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DocumentoContabil_obrigacaoId_fkey'
  ) THEN
    ALTER TABLE "DocumentoContabil"
      ADD CONSTRAINT "DocumentoContabil_obrigacaoId_fkey"
      FOREIGN KEY ("obrigacaoId") REFERENCES "ObrigacaoContabil"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DocumentoContabil_uploadedBy_fkey'
  ) THEN
    ALTER TABLE "DocumentoContabil"
      ADD CONSTRAINT "DocumentoContabil_uploadedBy_fkey"
      FOREIGN KEY ("uploadedBy") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "DocumentoContabil_obrigacaoId_createdAt_idx"
  ON "DocumentoContabil"("obrigacaoId", "createdAt");

CREATE INDEX IF NOT EXISTS "DocumentoContabil_categoria_createdAt_idx"
  ON "DocumentoContabil"("categoria", "createdAt");

CREATE TABLE IF NOT EXISTS "ComentarioContabil" (
  "id" TEXT NOT NULL,
  "obrigacaoId" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "autorId" TEXT NOT NULL,
  CONSTRAINT "ComentarioContabil_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ComentarioContabil_obrigacaoId_fkey'
  ) THEN
    ALTER TABLE "ComentarioContabil"
      ADD CONSTRAINT "ComentarioContabil_obrigacaoId_fkey"
      FOREIGN KEY ("obrigacaoId") REFERENCES "ObrigacaoContabil"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ComentarioContabil_autorId_fkey'
  ) THEN
    ALTER TABLE "ComentarioContabil"
      ADD CONSTRAINT "ComentarioContabil_autorId_fkey"
      FOREIGN KEY ("autorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "ComentarioContabil_obrigacaoId_createdAt_idx"
  ON "ComentarioContabil"("obrigacaoId", "createdAt");
