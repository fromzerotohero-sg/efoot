-- Classifica mensile: snapshot punti e premi (solo rank/nickname/punti in pubblico; breakdown interno)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points >= 0),
  rank INTEGER NOT NULL CHECK (rank >= 1),
  points_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month, user_id)
);

COMMENT ON TABLE leaderboard_snapshots IS 'Snapshot classifica mensile. points_breakdown solo per backend/profilo utente; in classifica pubblica solo rank, nickname, points.';

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_month_rank ON leaderboard_snapshots(month, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_user_month ON leaderboard_snapshots(user_id, month DESC);

ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
-- Nessuna policy: solo service_role (API) accede.

CREATE TABLE IF NOT EXISTS user_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  prize_type TEXT NOT NULL CHECK (prize_type IN ('coach_free', 'credits', 'match_ticket', 'stampa_3d')),
  position INTEGER NOT NULL CHECK (position >= 1),
  status TEXT NOT NULL DEFAULT 'pending_redemption' CHECK (status IN ('pending_redemption', 'redeemed')),
  redeemed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_prizes_user_status ON user_prizes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_prizes_month ON user_prizes(month);

ALTER TABLE user_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own prizes" ON user_prizes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own prizes (redeem)" ON user_prizes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
