-- ============================================
-- MIGRAZIONE: Crea tabella weekly_goals per obiettivi settimanali
-- Data: 26 Gennaio 2026
-- Sicurezza: IF NOT EXISTS (non distruttivo)
-- ============================================

-- 1. CREA TABELLA weekly_goals
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Obiettivo
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'reduce_goals_conceded',    -- Riduci gol subiti
    'increase_wins',            -- Aumenta vittorie
    'improve_possession',       -- Migliora possesso palla
    'use_recommended_formation', -- Usa formazione consigliata
    'complete_matches',         -- Completa N partite
    'improve_defense',          -- Migliora difesa
    'use_ai_recommendations',   -- Applica consigli IA
    'custom'                    -- Obiettivo personalizzato
  )),
  goal_description TEXT NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0.00,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Periodo
  week_start_date DATE NOT NULL, -- Lunedì
  week_end_date DATE NOT NULL,   -- Domenica
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week 
ON weekly_goals(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_status 
ON weekly_goals(user_id, status, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_active 
ON weekly_goals(user_id, status) 
WHERE status = 'active';

-- 3. RLS POLICIES (pattern esistente)
-- ============================================
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own goals" ON weekly_goals;
CREATE POLICY "Users can view own goals"
ON weekly_goals FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own goals" ON weekly_goals;
CREATE POLICY "Users can insert own goals"
ON weekly_goals FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE Policy - RIMOSSA (migration drop_weekly_goals_update_policy)
-- Solo backend (service_role) può aggiornare current_value, status, completed_at.
-- DROP POLICY IF EXISTS "Users can update own goals" ON weekly_goals;
-- CREATE POLICY "Users can update own goals" ON weekly_goals FOR UPDATE ...

-- DELETE Policy (per cleanup)
DROP POLICY IF EXISTS "Users can delete own goals" ON weekly_goals;
CREATE POLICY "Users can delete own goals"
ON weekly_goals FOR DELETE
USING ((select auth.uid()) = user_id);

-- 4. TRIGGER per updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_weekly_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_weekly_goals_updated_at ON weekly_goals;
CREATE TRIGGER trigger_update_weekly_goals_updated_at
BEFORE UPDATE ON weekly_goals
FOR EACH ROW
EXECUTE FUNCTION update_weekly_goals_updated_at();

-- 5. COMMENTI per documentazione
-- ============================================
COMMENT ON TABLE weekly_goals IS 'Obiettivi settimanali generati automaticamente dall''IA per ogni utente. Tracciati e aggiornati automaticamente dopo ogni partita.';
COMMENT ON COLUMN weekly_goals.goal_type IS 'Tipo obiettivo (reduce_goals_conceded, increase_wins, improve_possession, ecc.)';
COMMENT ON COLUMN weekly_goals.goal_description IS 'Descrizione obiettivo in linguaggio naturale (es. "Riduci gol subiti del 20%")';
COMMENT ON COLUMN weekly_goals.target_value IS 'Valore target da raggiungere (es. 1.6 gol/partita, 3 vittorie, 55% possesso)';
COMMENT ON COLUMN weekly_goals.current_value IS 'Valore attuale (aggiornato automaticamente dopo ogni partita)';
COMMENT ON COLUMN weekly_goals.week_start_date IS 'Data inizio settimana (Lunedì)';
COMMENT ON COLUMN weekly_goals.week_end_date IS 'Data fine settimana (Domenica)';
COMMENT ON COLUMN weekly_goals.status IS 'Status: active (in corso), completed (completato), failed (fallito)';

-- ============================================
-- NOTE POST-MIGRAZIONE
-- ============================================
-- 1. Verificare tabella creata:
--    SELECT COUNT(*) FROM weekly_goals;
--
-- 2. Testare RLS:
--    -- Login come utente A
--    -- Verificare di vedere solo i propri obiettivi
--    -- Verificare di non poter modificare obiettivi di altri utenti
--
-- 3. Verificare indici:
--    EXPLAIN SELECT * FROM weekly_goals 
--    WHERE user_id = '<test_user_id>' 
--    AND week_start_date >= CURRENT_DATE - INTERVAL '7 days'
--    ORDER BY week_start_date DESC;
--    -- Verificare che usi idx_weekly_goals_user_week
