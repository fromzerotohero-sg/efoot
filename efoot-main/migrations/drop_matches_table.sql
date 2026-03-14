-- ============================================
-- MIGRAZIONE: Rimozione completa tabella matches e dipendenze
-- Data: 2025
-- ============================================

-- 1. RIMUOVI FOREIGN KEYS che puntano a matches
-- ============================================

-- Rimuovi foreign key da ai_tasks
ALTER TABLE IF EXISTS ai_tasks 
DROP CONSTRAINT IF EXISTS ai_tasks_match_id_fkey;

-- Rimuovi foreign key da opponent_formations (se presente)
ALTER TABLE IF EXISTS opponent_formations 
DROP CONSTRAINT IF EXISTS fk_matches_opponent_formation_id;

-- 2. RIMUOVI TRIGGER su matches
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_matches_updated_at ON matches;
DROP TRIGGER IF EXISTS trigger_update_performance_aggregates ON matches;

-- 3. RIMUOVI FUNZIONI associate (se esistono)
-- ============================================
DROP FUNCTION IF EXISTS update_matches_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_performance_aggregates() CASCADE;

-- 4. RIMUOVI INDICI su matches
-- ============================================
DROP INDEX IF EXISTS idx_matches_user_date;
DROP INDEX IF EXISTS idx_matches_analysis_status;
DROP INDEX IF EXISTS idx_matches_opponent_formation;
DROP INDEX IF EXISTS idx_matches_photos_uploaded;

-- 5. RIMUOVI RLS POLICIES su matches
-- ============================================
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can insert own matches" ON matches;
DROP POLICY IF EXISTS "Users can update own matches" ON matches;
DROP POLICY IF EXISTS "Users can delete own matches" ON matches;

-- 6. RIMUOVI TABELLA matches
-- ============================================
DROP TABLE IF EXISTS matches CASCADE;
