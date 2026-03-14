-- ============================================
-- MIGRAZIONE: Fix slot_index constraint e ottimizzazione RLS
-- Data: 2024
-- ============================================

-- 1. FIX CRITICO: Constraint slot_index (0-10 invece di 0-20)
-- ============================================
-- Il constraint attuale permette slot_index 0-20, ma il codice usa solo 0-10
-- Questo può causare inconsistenze se valori 11-20 vengono inseriti direttamente nel DB

ALTER TABLE players 
DROP CONSTRAINT IF EXISTS players_slot_index_check;

ALTER TABLE players 
ADD CONSTRAINT players_slot_index_check 
CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10));

-- Verifica: Il constraint UNIQUE (user_id, slot_index) rimane invariato
-- Questo previene duplicati (es. stesso utente con slot_index 0 due volte)


-- 2. OTTIMIZZAZIONE: RLS Policies con (select auth.uid())
-- ============================================
-- Le policies attuali usano auth.uid() direttamente, che viene ri-valutato per ogni riga
-- Usando (select auth.uid()) viene valutato una sola volta per query

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own players" ON players;
CREATE POLICY "Users can view own players"
ON players FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own players" ON players;
CREATE POLICY "Users can insert own players"
ON players FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own players" ON players;
CREATE POLICY "Users can update own players"
ON players FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- DELETE Policy
DROP POLICY IF EXISTS "Users can delete own players" ON players;
CREATE POLICY "Users can delete own players"
ON players FOR DELETE
USING ((select auth.uid()) = user_id);


-- 3. PERFORMANCE: Indice foreign key playing_style_id
-- ============================================
-- Migliora performance di JOIN con playing_styles

CREATE INDEX IF NOT EXISTS idx_players_playing_style_id 
ON players(playing_style_id) 
WHERE playing_style_id IS NOT NULL;


-- 4. VERIFICA: Indici esistenti (già presenti, solo per riferimento)
-- ============================================
-- ✅ players_pkey (id)
-- ✅ players_user_id_idx (user_id)
-- ✅ players_slot_index_idx (user_id, slot_index) WHERE slot_index IS NOT NULL
-- ✅ players_user_id_slot_index_key UNIQUE (user_id, slot_index)


-- ============================================
-- NOTE POST-MIGRAZIONE
-- ============================================
-- 1. Verificare che il constraint slot_index funzioni:
--    SELECT * FROM players WHERE slot_index > 10; -- Dovrebbe essere vuoto
--
-- 2. Testare RLS policies:
--    - Login come utente A
--    - Verificare di vedere solo i propri giocatori
--    - Verificare di non poter modificare giocatori di altri utenti
--
-- 3. Verificare performance:
--    - Query su lista-giocatori dovrebbero essere più veloci
--    - JOIN con playing_styles dovrebbe usare l'indice
