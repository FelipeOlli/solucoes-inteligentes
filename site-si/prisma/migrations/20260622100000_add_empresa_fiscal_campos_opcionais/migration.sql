-- Adiciona colunas opcionais à EmpresaFiscal que existem no schema mas nunca foram
-- criadas via migration (foram criadas via db push e perdidas em resets do banco).
-- IF NOT EXISTS garante idempotência: não falha se a coluna já existir.

ALTER TABLE "EmpresaFiscal"
  ADD COLUMN IF NOT EXISTS "inscricaoEstadual"  TEXT,
  ADD COLUMN IF NOT EXISTS "inscricaoMunicipal" TEXT,
  ADD COLUMN IF NOT EXISTS "cnae"               TEXT,
  ADD COLUMN IF NOT EXISTS "cnaeDescricao"      TEXT,
  ADD COLUMN IF NOT EXISTS "endereco"           TEXT,
  ADD COLUMN IF NOT EXISTS "telefone"           TEXT,
  ADD COLUMN IF NOT EXISTS "email"              TEXT,
  ADD COLUMN IF NOT EXISTS "regimeApuracao"     TEXT,
  ADD COLUMN IF NOT EXISTS "tributacaoNacional"  JSONB,
  ADD COLUMN IF NOT EXISTS "tributacaoMunicipal" JSONB,
  ADD COLUMN IF NOT EXISTS "tributacaoFederal"   JSONB;
