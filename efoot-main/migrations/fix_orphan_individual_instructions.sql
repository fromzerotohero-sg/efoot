-- ============================================
-- MIGRAZIONE: Fix individual_instructions con player_id orfani
-- Data: 2026-01-28
-- Obiettivo: Rimuovere player_id inesistenti da individual_instructions
-- ============================================

-- 1. REPORT: Identifica individual_instructions con player_id orfani
-- ============================================
-- Query per vedere quali istruzioni hanno player_id orfani (prima del fix)
-- Esegui questa query per vedere il report:
/*
SELECT 
  tts.user_id,
  tts.id as settings_id,
  category_key,
  instruction_data->>'player_id' as orphan_player_id,
  instruction_data->>'instruction' as instruction_type
FROM team_tactical_settings tts,
  jsonb_each(tts.individual_instructions) AS category(category_key, instruction_data)
WHERE instruction_data->>'player_id' IS NOT NULL
  AND instruction_data->>'player_id' != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM players p 
    WHERE p.id::text = instruction_data->>'player_id' 
      AND p.user_id = tts.user_id
  )
ORDER BY tts.user_id, category_key;
*/

-- 2. FUNZIONE: Pulisce individual_instructions rimuovendo player_id orfani
-- ============================================
CREATE OR REPLACE FUNCTION fix_orphan_individual_instructions()
RETURNS TABLE(
  user_id UUID,
  settings_id UUID,
  category_removed TEXT,
  orphan_player_id TEXT,
  instructions_before JSONB,
  instructions_after JSONB
) AS $$
DECLARE
  rec RECORD;
  cleaned_instructions JSONB;
  category_key TEXT;
  instruction_data JSONB;
  has_changes BOOLEAN;
BEGIN
  -- Itera su tutti i team_tactical_settings
  FOR rec IN 
    SELECT id, user_id, individual_instructions
    FROM team_tactical_settings
    WHERE individual_instructions IS NOT NULL 
      AND individual_instructions != '{}'::jsonb
  LOOP
    cleaned_instructions := rec.individual_instructions;
    has_changes := FALSE;
    
    -- Itera su tutte le categorie
    FOR category_key IN SELECT jsonb_object_keys(cleaned_instructions) LOOP
      instruction_data := cleaned_instructions->category_key;
      
      -- Se questa istruzione ha un player_id, verifica che esista
      IF instruction_data->>'player_id' IS NOT NULL 
         AND instruction_data->>'player_id' != '' THEN
        
        -- Verifica se il giocatore esiste per questo utente
        IF NOT EXISTS (
          SELECT 1 
          FROM players p 
          WHERE p.id::text = instruction_data->>'player_id' 
            AND p.user_id = rec.user_id
        ) THEN
          -- Player_id orfano: rimuovi questa categoria
          cleaned_instructions := cleaned_instructions - category_key;
          has_changes := TRUE;
          
          -- Ritorna riga per report
          user_id := rec.user_id;
          settings_id := rec.id;
          category_removed := category_key;
          orphan_player_id := instruction_data->>'player_id';
          instructions_before := rec.individual_instructions;
          instructions_after := cleaned_instructions;
          RETURN NEXT;
        END IF;
      END IF;
    END LOOP;
    
    -- Se ci sono cambiamenti, aggiorna il record
    IF has_changes THEN
      UPDATE team_tactical_settings
      SET individual_instructions = cleaned_instructions,
          updated_at = NOW()
      WHERE id = rec.id;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ESEGUI FIX: Rimuove player_id orfani
-- ============================================
-- ATTENZIONE: Questo script MODIFICA i dati. Esegui prima la query di report sopra.
-- Per vedere cosa verrà rimosso senza modificare:
-- SELECT * FROM fix_orphan_individual_instructions();

-- Per applicare il fix:
-- SELECT * FROM fix_orphan_individual_instructions();

-- 4. VERIFICA POST-FIX: Query per verificare che non ci siano più orfani
-- ============================================
-- Dopo aver eseguito il fix, esegui questa query per verificare:
/*
SELECT 
  COUNT(*) as remaining_orphans
FROM team_tactical_settings tts,
  jsonb_each(tts.individual_instructions) AS category(category_key, instruction_data)
WHERE instruction_data->>'player_id' IS NOT NULL
  AND instruction_data->>'player_id' != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM players p 
    WHERE p.id::text = instruction_data->>'player_id' 
      AND p.user_id = tts.user_id
  );
-- Risultato atteso: 0
*/

-- 5. COMMENTI per documentazione
-- ============================================
COMMENT ON FUNCTION fix_orphan_individual_instructions() IS 
  'Funzione che identifica e rimuove player_id orfani da individual_instructions. Ritorna report delle correzioni effettuate.';
