-- ============================================
-- MIGRAZIONE: Relax Smart Coach usage limits
-- Scopo: rimuovere il concetto di quota cliente visibile/bloccante
-- ============================================

ALTER TABLE smart_coach_contexts
  DROP CONSTRAINT IF EXISTS smart_coach_contexts_countermeasures_used_check;

ALTER TABLE smart_coach_contexts
  ADD COLUMN IF NOT EXISTS chat_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE smart_coach_contexts
  ALTER COLUMN countermeasures_used SET DEFAULT 0;

ALTER TABLE smart_coach_contexts
  ADD CONSTRAINT smart_coach_contexts_countermeasures_used_check
  CHECK (countermeasures_used >= 0);
