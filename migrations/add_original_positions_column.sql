-- ============================================
-- MIGRAZIONE: Aggiungi colonna original_positions
-- Data: 24 Gennaio 2026
-- ============================================

-- 1. Aggiungi colonna original_positions (JSONB array)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS original_positions JSONB DEFAULT '[]'::jsonb;

-- 2. Commento colonna
COMMENT ON COLUMN players.original_positions IS 'Array di posizioni originali dalla card: [{"position": "AMF", "competence": "Alta"}, ...]';

-- 3. Indice GIN per query efficienti
CREATE INDEX IF NOT EXISTS idx_players_original_positions 
ON players USING GIN (original_positions);

-- 4. Verifica colonna creata
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'players' AND column_name = 'original_positions';
-- Deve restituire 1 riga con data_type = 'jsonb'
