-- ============================================
-- Notifiche in-app (campanella; niente push)
-- Data: 15 Settembre 2026
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notifiche in-app per utente (campanella). Inserite solo lato server via service role (bypassa RLS).';
COMMENT ON COLUMN public.notifications.type IS 'Categoria notifica (daily_spin, weekly_goals, credits, leaderboard, coach). Usata anche per le preferenze opt-out.';
COMMENT ON COLUMN public.notifications.title IS 'Titolo breve della notifica (italiano).';
COMMENT ON COLUMN public.notifications.body IS 'Testo opzionale della notifica.';
COMMENT ON COLUMN public.notifications.href IS 'Destinazione in-app al click (es. /impostazioni-profilo).';
COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp lettura; NULL = non letta.';

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Niente INSERT/DELETE lato client: gli insert avvengono server-side (service role).
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (mark read)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
