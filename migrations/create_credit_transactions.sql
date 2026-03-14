-- ============================================
-- Storico transazioni crediti (Hero Points) per Attività recente
-- Data: 6 Febbraio 2026
-- Uso: log acquisti e utilizzi per dashboard Gestione Profilo
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage')),
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE credit_transactions IS 'Storico transazioni Hero Points: purchase (+), usage (-). Per Attività recente in Gestione Profilo.';
COMMENT ON COLUMN credit_transactions.amount IS 'Crediti: positivo per acquisto, negativo per utilizzo (es. -50).';
COMMENT ON COLUMN credit_transactions.reference_id IS 'Opzionale: id partita, analisi, ecc.';

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
ON credit_transactions(user_id, created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credit transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);
