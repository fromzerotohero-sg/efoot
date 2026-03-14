-- ============================================
-- MIGRAZIONE: Aggiungi colonne AI Knowledge a user_profiles
-- Data: 26 Gennaio 2026
-- Sicurezza: IF NOT EXISTS (non distruttivo)
-- ============================================

-- 1. AGGIUNGI COLONNE (Sicuro: IF NOT EXISTS)
-- ============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS ai_knowledge_score DECIMAL(5,2) DEFAULT 0.00 CHECK (ai_knowledge_score >= 0 AND ai_knowledge_score <= 100),
ADD COLUMN IF NOT EXISTS ai_knowledge_level TEXT DEFAULT 'beginner' CHECK (ai_knowledge_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
ADD COLUMN IF NOT EXISTS ai_knowledge_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_knowledge_last_calculated TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS initial_division TEXT;

-- 2. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_knowledge 
ON user_profiles(user_id, ai_knowledge_score DESC);

-- 3. TRIGGER per salvare initial_division (solo se NULL)
-- ============================================
CREATE OR REPLACE FUNCTION set_initial_division()
RETURNS TRIGGER AS $$
BEGIN
  -- Salva initial_division solo se NULL e current_division è presente
  IF NEW.initial_division IS NULL AND NEW.current_division IS NOT NULL AND NEW.current_division != '' THEN
    NEW.initial_division := NEW.current_division;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_initial_division ON user_profiles;
CREATE TRIGGER trigger_set_initial_division
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION set_initial_division();

-- 4. COMMENTI per documentazione
-- ============================================
COMMENT ON COLUMN user_profiles.ai_knowledge_score IS 'Score 0-100 che indica quanto l''IA conosce il cliente. Calcolato da: Profilo (20%) + Rosa (25%) + Partite (30%) + Pattern (15%) + Allenatore (10%) + Utilizzo (10%) + Successi (15%)';
COMMENT ON COLUMN user_profiles.ai_knowledge_level IS 'Livello conoscenza: beginner (0-30%), intermediate (31-60%), advanced (61-80%), expert (81-100%)';
COMMENT ON COLUMN user_profiles.ai_knowledge_breakdown IS 'Dettaglio score per componente: {profile: 15, roster: 20, matches: 10, patterns: 5, coach: 0, usage: 2, success: 3}';
COMMENT ON COLUMN user_profiles.ai_knowledge_last_calculated IS 'Timestamp ultimo calcolo score (per cache e debugging)';
COMMENT ON COLUMN user_profiles.initial_division IS 'Divisione al primo login (per tracciare miglioramento divisione nel tempo)';

-- ============================================
-- NOTE POST-MIGRAZIONE
-- ============================================
-- 1. Verificare colonne aggiunte:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'user_profiles'
--    AND column_name LIKE 'ai_knowledge%';
--
-- 2. Verificare trigger:
--    UPDATE user_profiles SET current_division = 'Division 1' WHERE user_id = '<test_user_id>';
--    SELECT initial_division FROM user_profiles WHERE user_id = '<test_user_id>';
--    -- Verificare che initial_division sia stato salvato
--
-- 3. Verificare indici:
--    EXPLAIN SELECT * FROM user_profiles WHERE user_id = '<test_user_id>' ORDER BY ai_knowledge_score DESC;
--    -- Verificare che usi idx_user_profiles_ai_knowledge
