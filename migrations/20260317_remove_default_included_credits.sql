-- ============================================
-- MIGRAZIONE: Rimuove crediti inclusi di default
-- Data: 17 Marzo 2026
-- Scopo:
-- - credits_included non deve partire da 200 "gratis"
-- - credits_included rappresenta solo crediti acquistati (o saldo MetalGate via API)
-- - Backfill: riallinea user_credit_usage ai purchase in credit_transactions
-- ============================================

BEGIN;

-- 1) Rende credits_included >= 0 (prima era > 0)
ALTER TABLE user_credit_usage
  DROP CONSTRAINT IF EXISTS user_credit_usage_credits_included_check;

ALTER TABLE user_credit_usage
  ADD CONSTRAINT user_credit_usage_credits_included_check CHECK (credits_included >= 0);

-- 2) Default a 0 (niente crediti inclusi di default)
ALTER TABLE user_credit_usage
  ALTER COLUMN credits_included SET DEFAULT 0;

-- 3) Backfill: per ogni (user_id, period_key) imposta credits_included = somma acquisti del periodo.
-- Nota: period_key è in formato YYYY-MM e usiamo UTC per coerenza.
WITH purchases_by_period AS (
  SELECT
    user_id,
    to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS period_key,
    COALESCE(SUM(amount), 0) AS purchased_total
  FROM credit_transactions
  WHERE type = 'purchase'
  GROUP BY 1, 2
)
UPDATE user_credit_usage u
SET credits_included = COALESCE(p.purchased_total, 0)
FROM purchases_by_period p
WHERE u.user_id = p.user_id
  AND u.period_key = p.period_key;

-- 4) Se non ci sono acquisti per quel periodo, porta credits_included a 0.
UPDATE user_credit_usage u
SET credits_included = 0
WHERE COALESCE(u.credits_included, 0) <> 0
  AND NOT EXISTS (
    SELECT 1
    FROM credit_transactions t
    WHERE t.user_id = u.user_id
      AND t.type = 'purchase'
      AND to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM') = u.period_key
  );

COMMIT;

