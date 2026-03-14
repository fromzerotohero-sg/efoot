-- ============================================
-- ROLLBACK: Rimuovi colonne AI Knowledge e tabella weekly_goals
-- Data: 26 Gennaio 2026
-- ATTENZIONE: Eseguire solo se necessario rollback completo
-- ============================================

-- 1. RIMUOVI COLONNE user_profiles
-- ============================================
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS ai_knowledge_score,
DROP COLUMN IF EXISTS ai_knowledge_level,
DROP COLUMN IF EXISTS ai_knowledge_breakdown,
DROP COLUMN IF EXISTS ai_knowledge_last_calculated,
DROP COLUMN IF EXISTS initial_division;

-- 2. RIMUOVI TABELLA weekly_goals
-- ============================================
DROP TABLE IF EXISTS weekly_goals CASCADE;

-- 3. RIMUOVI TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_set_initial_division ON user_profiles;
DROP FUNCTION IF EXISTS set_initial_division();

DROP TRIGGER IF EXISTS trigger_update_weekly_goals_updated_at ON weekly_goals;
DROP FUNCTION IF EXISTS update_weekly_goals_updated_at();

-- 4. RIMUOVI INDICI
-- ============================================
DROP INDEX IF EXISTS idx_user_profiles_ai_knowledge;
DROP INDEX IF EXISTS idx_weekly_goals_user_week;
DROP INDEX IF EXISTS idx_weekly_goals_status;
DROP INDEX IF EXISTS idx_weekly_goals_active;

-- ============================================
-- VERIFICA ROLLBACK
-- ============================================
-- 1. Verificare colonne rimosse:
--    SELECT column_name 
--    FROM information_schema.columns
--    WHERE table_name = 'user_profiles'
--    AND column_name LIKE 'ai_knowledge%';
--    -- Dovrebbe restituire 0 righe
--
-- 2. Verificare tabella rimossa:
--    SELECT COUNT(*) FROM weekly_goals;
--    -- Dovrebbe dare errore "relation does not exist"
--
-- 3. Verificare trigger rimossi:
--    SELECT trigger_name 
--    FROM information_schema.triggers
--    WHERE trigger_name LIKE '%ai_knowledge%' OR trigger_name LIKE '%weekly_goals%';
--    -- Dovrebbe restituire 0 righe
