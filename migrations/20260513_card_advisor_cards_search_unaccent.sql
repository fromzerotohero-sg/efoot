-- Ricerca per nome su card_advisor_cards insensibile agli accenti.
-- Richiede estensione unaccent (gia creata con player_catalog_search_unaccent).

CREATE OR REPLACE FUNCTION public.rpc_card_advisor_cards_search_by_name(
  p_q text,
  p_source text,
  p_position text,
  p_limit int
)
RETURNS SETOF public.card_advisor_cards
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT c.*
  FROM public.card_advisor_cards c
  WHERE c.is_active IS TRUE
    AND c.source = COALESCE(NULLIF(TRIM(p_source), ''), 'efhub')
    AND c.position = TRIM(p_position)
    AND NULLIF(TRIM(p_q), '') IS NOT NULL
    AND extensions.unaccent(COALESCE(c.player_name::text, ''))
        ILIKE '%' || extensions.unaccent(TRIM(p_q)) || '%'
  ORDER BY c.player_name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 12), 40));
$$;

COMMENT ON FUNCTION public.rpc_card_advisor_cards_search_by_name(text, text, text, int) IS
  'card_advisor_cards: match nome con unaccent; filtri source, position, is_active.';

GRANT EXECUTE ON FUNCTION public.rpc_card_advisor_cards_search_by_name(text, text, text, int)
  TO anon, authenticated, service_role;
