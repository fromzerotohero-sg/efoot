-- ============================================
-- MIGRAZIONE: Cleanup automatico individual_instructions quando giocatore viene eliminato
-- Data: 2026-01-28
-- Obiettivo: Prevenire player_id orfani in individual_instructions
-- ============================================

-- 1. FUNZIONE: Rimuove player_id orfano da individual_instructions
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_orphan_individual_instructions()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id UUID;
  cleaned_instructions JSONB;
  category_key TEXT;
  instruction_data JSONB;
BEGIN
  -- Ottieni user_id del giocatore eliminato
  affected_user_id := OLD.user_id;
  
  -- Trova team_tactical_settings per questo utente
  SELECT individual_instructions INTO cleaned_instructions
  FROM team_tactical_settings
  WHERE user_id = affected_user_id
  LIMIT 1;
  
  -- Se non ci sono impostazioni, esci
  IF cleaned_instructions IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Itera su tutte le categorie (attacco_1, attacco_2, difesa_1, difesa_2)
  FOR category_key IN SELECT jsonb_object_keys(cleaned_instructions) LOOP
    instruction_data := cleaned_instructions->category_key;
    
    -- Se questa istruzione punta al giocatore eliminato, rimuovila
    IF instruction_data->>'player_id' = OLD.id::TEXT THEN
      cleaned_instructions := cleaned_instructions - category_key;
    END IF;
  END LOOP;
  
  -- Aggiorna team_tactical_settings con istruzioni pulite
  UPDATE team_tactical_settings
  SET individual_instructions = cleaned_instructions,
      updated_at = NOW()
  WHERE user_id = affected_user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Esegue cleanup dopo eliminazione giocatore
-- ============================================
DROP TRIGGER IF EXISTS trigger_cleanup_individual_instructions ON players;
CREATE TRIGGER trigger_cleanup_individual_instructions
  AFTER DELETE ON players
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_orphan_individual_instructions();

-- 3. COMMENTI per documentazione
-- ============================================
COMMENT ON FUNCTION cleanup_orphan_individual_instructions() IS 
  'Pulisce automaticamente individual_instructions quando un giocatore viene eliminato. Rimuove tutte le istruzioni che puntano al player_id eliminato.';

COMMENT ON TRIGGER trigger_cleanup_individual_instructions ON players IS 
  'Trigger che esegue cleanup automatico di individual_instructions dopo DELETE su players.';
