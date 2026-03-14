-- ============================================
-- MIGRAZIONE: Tabella utilizzo crediti per utente/periodo (mensile)
-- Data: 30 Gennaio 2026
-- Uso: tracciare crediti consumati (OpenAI) per barra e pricing
-- ============================================

-- 1. TABELLA
-- ============================================
CREATE TABLE IF NOT EXISTS user_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  credits_included INTEGER NOT NULL DEFAULT 200 CHECK (credits_included > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_key)
);

COMMENT ON TABLE user_credit_usage IS 'Crediti consumati per utente e periodo (period_key = YYYY-MM). Incrementato dalle route OpenAI.';
COMMENT ON COLUMN user_credit_usage.period_key IS 'Chiave periodo mensile: YYYY-MM (es. 2026-01).';
COMMENT ON COLUMN user_credit_usage.credits_used IS 'Crediti già consumati nel periodo.';
COMMENT ON COLUMN user_credit_usage.credits_included IS 'Crediti inclusi nel piano per il periodo (es. 200 per abbonamento 20€).';

-- 2. INDICI
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_credit_usage_user_period
ON user_credit_usage(user_id, period_key);

-- 3. RLS
-- ============================================
ALTER TABLE user_credit_usage ENABLE ROW LEVEL SECURITY;

-- Utente vede solo i propri record
CREATE POLICY "Users can read own credit usage"
ON user_credit_usage FOR SELECT
USING (auth.uid() = user_id);

-- Inserimento/aggiornamento solo da service role (backend); nessuna policy INSERT/UPDATE per auth.uid() così il client non può alterare i crediti
-- Il backend usa service role e bypassa RLS

-- 4. TRIGGER updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_user_credit_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_credit_usage_updated_at ON user_credit_usage;
CREATE TRIGGER trigger_user_credit_usage_updated_at
BEFORE UPDATE ON user_credit_usage
FOR EACH ROW
EXECUTE FUNCTION update_user_credit_usage_updated_at();
