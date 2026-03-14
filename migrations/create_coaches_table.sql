-- ============================================
-- MIGRAZIONE: Tabella coaches per gestione allenatori
-- Data: 2025
-- ============================================

-- 1. CREA TABELLA coaches
-- ============================================
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base
  coach_name TEXT NOT NULL,
  age INTEGER,
  nationality TEXT,
  team TEXT,
  category TEXT,
  pack_type TEXT,
  
  -- Competenza Stili di Gioco (5 valori numerici)
  -- JSONB: { "possesso_palla": 46, "contropiede_veloce": 57, "contrattacco": 89, "vie_laterali": 64, "passaggio_lungo": 89 }
  playing_style_competence JSONB DEFAULT '{}'::jsonb,
  
  -- Affinità di allenamento
  training_affinity_description TEXT,
  stat_boosters JSONB DEFAULT '[]'::jsonb, -- [{"stat_name": "Finalizzazione", "bonus": 1}, ...]
  
  -- Collegamento (opzionale - tatica speciale)
  connection JSONB, -- { "name": "...", "description": "...", "focal_point": {...}, "key_man": {...} }
  
  -- Tracciamento foto caricate
  photo_slots JSONB DEFAULT '{}'::jsonb,
  
  -- Dati raw estratti (backup)
  extracted_data JSONB,
  
  -- Allenatore attivo/titolare (UNIQUE per user_id)
  is_active BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONSTRAINT: Solo un allenatore attivo per utente
-- ============================================
-- Usa UNIQUE parziale per garantire max 1 is_active=true per user_id
CREATE UNIQUE INDEX IF NOT EXISTS coaches_user_id_is_active_unique 
ON coaches(user_id) 
WHERE is_active = true;

-- 3. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coaches_user_id 
ON coaches(user_id);

CREATE INDEX IF NOT EXISTS idx_coaches_is_active 
ON coaches(user_id, is_active) 
WHERE is_active = true;

-- 4. RLS POLICIES (pattern esistente con (select auth.uid()))
-- ============================================
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own coaches" ON coaches;
CREATE POLICY "Users can view own coaches"
ON coaches FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own coaches" ON coaches;
CREATE POLICY "Users can insert own coaches"
ON coaches FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own coaches" ON coaches;
CREATE POLICY "Users can update own coaches"
ON coaches FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- DELETE Policy
DROP POLICY IF EXISTS "Users can delete own coaches" ON coaches;
CREATE POLICY "Users can delete own coaches"
ON coaches FOR DELETE
USING ((select auth.uid()) = user_id);

-- 5. TRIGGER per updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_coaches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coaches_updated_at_trigger ON coaches;
CREATE TRIGGER coaches_updated_at_trigger
BEFORE UPDATE ON coaches
FOR EACH ROW
EXECUTE FUNCTION update_coaches_updated_at();

-- ============================================
-- NOTE POST-MIGRAZIONE
-- ============================================
-- 1. Verificare constraint is_active:
--    SELECT user_id, COUNT(*) FROM coaches WHERE is_active = true GROUP BY user_id; -- Max 1 per user_id
--
-- 2. Testare RLS:
--    - Login come utente A
--    - Verificare di vedere solo i propri allenatori
--    - Verificare di non poter modificare allenatori di altri utenti
--
-- 3. Verificare performance:
--    - Query su lista allenatori dovrebbero usare idx_coaches_user_id
--    - Query su allenatore attivo dovrebbe usare idx_coaches_is_active
