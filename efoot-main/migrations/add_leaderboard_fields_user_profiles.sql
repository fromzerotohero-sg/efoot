-- Classifica mensile: nickname (visibile in classifica) e consenso
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS leaderboard_consent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.nickname IS 'Nome visibile in classifica (From Zero to Hero). Se null, non mostrare in classifica o usare fallback.';
COMMENT ON COLUMN user_profiles.leaderboard_consent IS 'Consenso a comparire in classifica mensile (posizione + nickname + punti).';
