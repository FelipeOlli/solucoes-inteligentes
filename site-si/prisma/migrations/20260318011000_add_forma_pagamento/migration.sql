-- Adiciona enum FormaPagamento e coluna formaPagamento em Servico

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FormaPagamento') THEN
    CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO');
  END IF;
END$$;

ALTER TABLE "Servico"
ADD COLUMN IF NOT EXISTS "formaPagamento" "FormaPagamento";

