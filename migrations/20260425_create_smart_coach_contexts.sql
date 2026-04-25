-- ============================================
-- MIGRAZIONE: Smart Coach contexts (separati dal Pro)
-- Scopo: contesto leggero per prova Smart senza toccare rosa, tattica o cache del Pro
-- ============================================

CREATE TABLE IF NOT EXISTS smart_coach_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  formation TEXT,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  coach JSONB,
  extraction_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  chat_used BOOLEAN NOT NULL DEFAULT false,
  countermeasures_used INTEGER NOT NULL DEFAULT 0 CHECK (countermeasures_used >= 0 AND countermeasures_used <= 2),
  last_countermeasures JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_chat_answer TEXT,
  last_chat_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_coach_contexts_user_id
  ON smart_coach_contexts(user_id);

ALTER TABLE smart_coach_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smart_coach_contexts_select_own" ON smart_coach_contexts;
CREATE POLICY "smart_coach_contexts_select_own"
  ON smart_coach_contexts FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "smart_coach_contexts_insert_own" ON smart_coach_contexts;
CREATE POLICY "smart_coach_contexts_insert_own"
  ON smart_coach_contexts FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "smart_coach_contexts_update_own" ON smart_coach_contexts;
CREATE POLICY "smart_coach_contexts_update_own"
  ON smart_coach_contexts FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
