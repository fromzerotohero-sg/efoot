-- ============================================
-- MIGRAZIONE: Tabella user_profiles per profilo utente
-- Data: 2025
-- ============================================

-- 1. CREA TABELLA user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Dati Anagrafici (Opzionali)
  first_name TEXT, -- Nome
  last_name TEXT, -- Cognome
  
  -- Dati Gioco (Opzionali)
  current_division TEXT, -- Divisione attuale (es. "Division 1", "Division 3")
  favorite_team TEXT, -- Squadra del cuore
  team_name TEXT, -- Nome squadra nel gioco
  
  -- Preferenze IA (Opzionali)
  ai_name TEXT, -- Nome che vuoi dare all'IA (es. "Coach Mario", "Alex")
  how_to_remember TEXT, -- Come vuoi che ti ricordi l'IA (es. "Sono un giocatore competitivo", "Gioco per divertimento")
  
  -- Esperienza Gioco (Opzionali)
  hours_per_week INTEGER, -- Quante ore giochi a settimana
  common_problems TEXT[], -- Array di problemi riscontrati (es. ["passaggi", "difesa", "centrocampo"])
  
  -- Profilazione Completa
  profile_completion_score DECIMAL(5,2) DEFAULT 0.00 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
  profile_completion_level TEXT DEFAULT 'beginner' CHECK (profile_completion_level IN ('beginner', 'intermediate', 'complete')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- 2. TRIGGER per calcolo automatico profile_completion_score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_profile_completion_score()
RETURNS TRIGGER AS $$
DECLARE
  score DECIMAL(5,2) := 0;
  level TEXT;
  total_fields INTEGER := 8; -- Totale campi opzionali
  filled_fields INTEGER := 0;
BEGIN
  -- Conta campi compilati
  IF NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.current_division IS NOT NULL AND NEW.current_division != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.favorite_team IS NOT NULL AND NEW.favorite_team != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.team_name IS NOT NULL AND NEW.team_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.ai_name IS NOT NULL AND NEW.ai_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.how_to_remember IS NOT NULL AND NEW.how_to_remember != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.hours_per_week IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  -- common_problems può essere array vuoto, quindi non conta se vuoto
  
  -- Calcola score (ogni campo = 12.5%, max 100%)
  score := (filled_fields::DECIMAL / total_fields::DECIMAL) * 100;
  
  -- Calcola livello
  IF score >= 87.5 THEN
    level := 'complete';
  ELSIF score >= 50 THEN
    level := 'intermediate';
  ELSE
    level := 'beginner';
  END IF;
  
  NEW.profile_completion_score := score;
  NEW.profile_completion_level := level;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_profile_completion ON user_profiles;
CREATE TRIGGER trigger_calculate_profile_completion
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_profile_completion_score();

-- 3. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completion_score ON user_profiles(profile_completion_score DESC);

-- 4. RLS POLICIES (pattern esistente con (select auth.uid()))
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- NOTE POST-MIGRAZIONE
-- ============================================
-- 1. Verificare trigger:
--    INSERT INTO user_profiles (user_id, first_name, last_name) 
--    VALUES ('<user_id>', 'Mario', 'Rossi');
--    -- Verificare che profile_completion_score sia calcolato (25% = 2 campi su 8)
--    -- Verificare che profile_completion_level sia 'beginner'
--
-- 2. Testare RLS:
--    - Login come utente A
--    - Verificare di vedere solo il proprio profilo
--    - Verificare di non poter modificare profilo di altri utenti
--
-- 3. Verificare performance:
--    - Query su profilo utente dovrebbero usare idx_user_profiles_user_id
--    - Query ordinate per completion score dovrebbero usare idx_user_profiles_completion_score
