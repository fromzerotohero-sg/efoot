-- Migration: Create team_tactical_settings table
-- Pattern identico a formation_layout

CREATE TABLE IF NOT EXISTS team_tactical_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stile di gioco di squadra (Team Playing Style)
  team_playing_style TEXT CHECK (team_playing_style IN (
    'possesso_palla',
    'contropiede_veloce', 
    'contrattacco',
    'vie_laterali',
    'passaggio_lungo'
  )),
  
  -- Istruzioni Individuali (JSONB per flessibilità)
  -- Struttura:
  -- {
  --   "attacco_1": { "player_id": "uuid", "instruction": "ancoraggio", "enabled": true },
  --   "attacco_2": { "player_id": "uuid", "instruction": "offensivo", "enabled": true },
  --   "difesa_1": { "player_id": "uuid", "instruction": "linea_bassa", "enabled": true },
  --   "difesa_2": { "player_id": "uuid", "instruction": "marcatura_stretta", "enabled": true }
  -- }
  -- Istruzioni disponibili:
  -- Attacco 1/2: "difensivo", "offensivo", "ancoraggio"
  -- Difesa 1/2: "marcatura_stretta", "marcatura_uomo", "contropiede" (obiettivo contropiede), "linea_bassa"
  individual_instructions JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un solo record per utente (stesso pattern di formation_layout)
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_team_tactical_settings_user_id 
ON team_tactical_settings(user_id);

-- RLS (stesso pattern di formation_layout e coaches)
ALTER TABLE team_tactical_settings ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own settings" ON team_tactical_settings;
CREATE POLICY "Users can view own settings"
  ON team_tactical_settings FOR SELECT
  USING ((select auth.uid()) = user_id);

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own settings" ON team_tactical_settings;
CREATE POLICY "Users can insert own settings"
  ON team_tactical_settings FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own settings" ON team_tactical_settings;
CREATE POLICY "Users can update own settings"
  ON team_tactical_settings FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- DELETE Policy
DROP POLICY IF EXISTS "Users can delete own settings" ON team_tactical_settings;
CREATE POLICY "Users can delete own settings"
  ON team_tactical_settings FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Trigger updated_at (stesso pattern di formation_layout)
CREATE OR REPLACE FUNCTION update_team_tactical_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_tactical_settings_updated_at
  BEFORE UPDATE ON team_tactical_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_team_tactical_settings_updated_at();
