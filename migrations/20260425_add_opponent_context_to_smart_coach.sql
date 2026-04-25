-- ============================================
-- MIGRAZIONE: Opponent context per Smart Coach
-- Scopo: contromisure Smart basate su formazione cliente persistita + avversario caricato
-- ============================================

ALTER TABLE smart_coach_contexts
  ADD COLUMN IF NOT EXISTS opponent_formation TEXT;

ALTER TABLE smart_coach_contexts
  ADD COLUMN IF NOT EXISTS opponent_players JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE smart_coach_contexts
  ADD COLUMN IF NOT EXISTS opponent_coach JSONB;

ALTER TABLE smart_coach_contexts
  ADD COLUMN IF NOT EXISTS opponent_extraction_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
