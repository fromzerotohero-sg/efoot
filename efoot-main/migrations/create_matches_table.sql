-- ============================================
-- MIGRAZIONE: Tabella matches per profilazione cliente
-- Data: 2025
-- ============================================

-- 1. CREA TABELLA matches
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati Partita Base
  match_date TIMESTAMPTZ DEFAULT NOW(),
  opponent_name TEXT,
  result TEXT, -- "6-1", "2-0", ecc.
  is_home BOOLEAN DEFAULT true,
  
  -- Formazione e Stile
  formation_played TEXT, -- "4-2-1-3", "4-3-3", ecc.
  playing_style_played TEXT, -- "Contrattacco", "Possesso palla", ecc.
  team_strength INTEGER, -- Forza complessiva squadra (es. 3245)
  opponent_formation_id UUID REFERENCES opponent_formations(id) ON DELETE SET NULL,
  
  -- Dati Estratti (JSONB per flessibilità)
  player_ratings JSONB DEFAULT '{}'::jsonb, -- { "Del Piero": { "rating": 8.5, "goals": 2, "assists": 1 }, ... }
  team_stats JSONB DEFAULT '{}'::jsonb, -- { "possession": 49, "shots": 16, "shots_on_target": 10, ... }
  attack_areas JSONB DEFAULT '{}'::jsonb, -- { "team1": { "left": 46, "center": 45, "right": 9 }, "team2": { ... } }
  ball_recovery_zones JSONB DEFAULT '[]'::jsonb, -- Array di punti { "x": 0.3, "y": 0.5, "team": "team1" }
  goals_events JSONB DEFAULT '[]'::jsonb, -- Array di eventi gol { "minute": 15, "scorer": "Del Piero", "team": "team1" }
  formation_discrepancies JSONB DEFAULT '[]'::jsonb, -- Differenze tra formazione pianificata e usata
  
  -- Metadata Estrazione
  extracted_data JSONB DEFAULT '{}'::jsonb, -- Dati raw dall'estrazione AI
  photos_uploaded INTEGER DEFAULT 0 CHECK (photos_uploaded >= 0 AND photos_uploaded <= 5),
  missing_photos TEXT[] DEFAULT '{}'::text[], -- Array di sezioni mancanti: ["player_ratings", "team_stats", ...]
  data_completeness TEXT DEFAULT 'partial' CHECK (data_completeness IN ('partial', 'complete')),
  
  -- Tracking
  credits_used INTEGER DEFAULT 0 CHECK (credits_used >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_matches_user_date 
ON matches(user_id, match_date DESC);

CREATE INDEX IF NOT EXISTS idx_matches_opponent_formation 
ON matches(opponent_formation_id) 
WHERE opponent_formation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_photos_uploaded 
ON matches(photos_uploaded) 
WHERE photos_uploaded > 0;

-- 3. RLS POLICIES
-- ============================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti possono vedere solo i propri match
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches"
ON matches FOR SELECT
USING ((select auth.uid()) = user_id);

-- Policy: Utenti possono inserire solo i propri match
DROP POLICY IF EXISTS "Users can insert own matches" ON matches;
CREATE POLICY "Users can insert own matches"
ON matches FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Utenti possono aggiornare solo i propri match
DROP POLICY IF EXISTS "Users can update own matches" ON matches;
CREATE POLICY "Users can update own matches"
ON matches FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Utenti possono eliminare solo i propri match
DROP POLICY IF EXISTS "Users can delete own matches" ON matches;
CREATE POLICY "Users can delete own matches"
ON matches FOR DELETE
USING ((select auth.uid()) = user_id);

-- 4. TRIGGER per updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_matches_updated_at ON matches;
CREATE TRIGGER trigger_update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_matches_updated_at();
