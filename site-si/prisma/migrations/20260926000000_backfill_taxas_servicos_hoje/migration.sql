-- Corrige taxa da maquininha e imposto dos serviços registrados em 26/09/2026
-- (horário de Brasília = 03:00 UTC do dia 26 até 03:00 UTC do dia 27).
--
-- Antes: serviço criado à mão caía na taxa fixa de 3,99% para crédito
-- (independente das parcelas) e imposto 0; serviço vindo do orçamento
-- gravava taxa 0 mesmo quando a forma era crédito/débito.
--
-- Agora: taxa = tabela real SumUp da conta SI por parcelas (lib/taxas.ts);
-- imposto = alíquota efetiva do Simples Anexo III (6,00%, conferida no
-- PGDAS-D) quando não veio do orçamento. Crédito sem parcelas vira 1x —
-- ajuste as parcelas no detalhe do serviço que a taxa é recalculada.

UPDATE "Servico"
SET "parcelas" = CASE
      WHEN "formaPagamento" = 'CREDITO' THEN LEAST(GREATEST(COALESCE("parcelas", 1), 1), 10)
      ELSE NULL
    END,
    "taxaPercentual" = CASE "formaPagamento"
      WHEN 'CREDITO' THEN (ARRAY[4.9, 9.8, 11.1, 12.5, 13.8, 15.1, 16.4, 17.7, 19.0, 20.1]::DOUBLE PRECISION[])[LEAST(GREATEST(COALESCE("parcelas", 1), 1), 10)]
      WHEN 'DEBITO' THEN 3.99
      ELSE 0
    END
WHERE "createdAt" >= '2026-09-26 03:00:00' AND "createdAt" < '2026-09-27 03:00:00'
  AND "formaPagamento" IS NOT NULL;

UPDATE "Servico"
SET "impostoPercentual" = 6.0
WHERE "createdAt" >= '2026-09-26 03:00:00' AND "createdAt" < '2026-09-27 03:00:00'
  AND "impostoPercentual" IS NULL;
