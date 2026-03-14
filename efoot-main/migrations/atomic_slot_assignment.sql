-- ============================================
-- RC-001: Assegnazione atomica slot (evita race condition)
-- Data: 2026-01-30
-- Eseguito via MCP Supabase; conservato in repo per riferimento.
-- ============================================

CREATE OR REPLACE FUNCTION atomic_slot_assignment(
  p_user_id UUID,
  p_slot_index INTEGER,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_player_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || '_' || p_slot_index::text)::bigint);

  SELECT id INTO v_existing_player_id
  FROM players
  WHERE user_id = p_user_id
    AND slot_index = p_slot_index
    AND id != p_player_id;

  IF v_existing_player_id IS NOT NULL THEN
    UPDATE players
    SET slot_index = NULL, updated_at = NOW()
    WHERE id = v_existing_player_id;
  END IF;

  UPDATE players
  SET slot_index = p_slot_index, updated_at = NOW()
  WHERE id = p_player_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Giocatore non trovato';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'previous_player_id', v_existing_player_id
  );
END;
$$;

COMMENT ON FUNCTION atomic_slot_assignment(UUID, INTEGER, UUID) IS
  'RC-001: Assegnazione atomica slot con lock per evitare race condition tra due richieste simultanee.';
