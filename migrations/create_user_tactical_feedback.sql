-- =============================================================
-- Migration: create_user_tactical_feedback
-- Chat Palestra Coach: feedback post-partita e info profilo
-- raccolti tramite conversazione con IA dedicata.
-- Già applicata su Supabase via MCP il 2026-02-13.
-- =============================================================

-- 1. Tabella
CREATE TABLE IF NOT EXISTS public.user_tactical_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,

  -- Tipo sessione
  session_type text NOT NULL DEFAULT 'feedback'
    CHECK (session_type IN ('profile_setup', 'feedback', 'update')),

  -- Dati partita (pre-popolati dalla match se presente)
  formation_played text,
  style_played text,
  opponent_name text,
  outcome text CHECK (outcome IS NULL OR outcome IN ('win', 'loss', 'draw')),

  -- Contenuto estratto dalla conversazione
  conversation_summary text,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_fields_updated jsonb DEFAULT '[]'::jsonb,

  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.user_tactical_feedback IS
  'Sessioni Palestra Coach: feedback post-partita e info profilo raccolti tramite chat IA dedicata. Letti da diagnosticBuilder per sezione ESPERIENZA COACH e da aiKnowledgeHelper per score coach_training.';
COMMENT ON COLUMN public.user_tactical_feedback.session_type IS
  'Tipo sessione: profile_setup (prima volta), feedback (post-partita), update (aggiornamento generico).';
COMMENT ON COLUMN public.user_tactical_feedback.insights IS
  'Array JSON di insight tattici: [{"type": "weakness|strength|lesson", "text": "..."}]';
COMMENT ON COLUMN public.user_tactical_feedback.profile_fields_updated IS
  'Array JSON di campi profilo aggiornati in questa sessione: ["platform", "pass_level", "ai_weak_point"]';

-- 2. RLS
ALTER TABLE public.user_tactical_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tactical feedback"
  ON public.user_tactical_feedback FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own tactical feedback"
  ON public.user_tactical_feedback FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own tactical feedback"
  ON public.user_tactical_feedback FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 3. Indici
CREATE INDEX idx_user_tactical_feedback_user_recent
  ON public.user_tactical_feedback (user_id, created_at DESC);

CREATE INDEX idx_user_tactical_feedback_match
  ON public.user_tactical_feedback (match_id)
  WHERE match_id IS NOT NULL;
