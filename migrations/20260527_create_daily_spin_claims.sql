-- ============================================
-- Daily spin claims (una volta al giorno per utente)
-- Data: 27 Maggio 2026
-- ============================================

CREATE TABLE IF NOT EXISTS daily_spin_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spin_date DATE NOT NULL,
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, spin_date)
);

COMMENT ON TABLE daily_spin_claims IS 'Storico ruota giornaliera: una spin per utente al giorno.';
COMMENT ON COLUMN daily_spin_claims.spin_date IS 'Data logica della spin (timezone app).';
COMMENT ON COLUMN daily_spin_claims.reward_amount IS 'HP assegnati dalla ruota per quella data.';

CREATE INDEX IF NOT EXISTS idx_daily_spin_claims_user_date
ON daily_spin_claims(user_id, spin_date DESC);

ALTER TABLE daily_spin_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily spin claims"
ON daily_spin_claims FOR SELECT
USING (auth.uid() = user_id);
