-- Preferenze notifiche in-app per utente (opt-out per categoria)
-- Data: 15 Settembre 2026
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.notification_prefs IS 'Preferenze notifiche per categoria: weekly_goals, credits, leaderboard, coach. Chiave assente = ON (opt-out esplicito con false).';
