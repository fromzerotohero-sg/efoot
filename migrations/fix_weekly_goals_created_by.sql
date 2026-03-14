-- ============================================
-- MIGRAZIONE: Aggiungi colonna created_by a weekly_goals
-- Data: 27 Gennaio 2026
-- Sicurezza: IF NOT EXISTS (non distruttivo)
-- ============================================

-- Aggiungi colonna created_by se mancante
ALTER TABLE weekly_goals
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system' 
CHECK (created_by IN ('system', 'user', 'admin'));

-- Commento
COMMENT ON COLUMN weekly_goals.created_by IS 'Chi ha creato il task: system (automatico), user (manuale), admin (amministratore)';
