-- Ricerca catalogo giocatori insensibile agli accenti (ILIKE da solo non lo e).
-- Su Supabase: eseguire da SQL Editor o `supabase db push`.
-- Richiede estensione `unaccent` (disponibile sui progetti Supabase).

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpc_player_catalog_search(
  p_q text,
  p_card_type text,
  p_sort text,
  p_limit int,
  p_offset int
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_sort text := trim(coalesce(p_sort, 'name_asc'));
  lim int := greatest(1, least(coalesce(p_limit, 24), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT pc.*
      FROM public.player_catalog pc
      WHERE pc.source = 'pesdb'
        AND pc.catalog_ready IS TRUE
        AND pc.needs_review IS FALSE
        AND (nullif(trim(p_card_type), '') IS NULL OR pc.card_type = trim(p_card_type))
        AND (
          nullif(trim(p_q), '') IS NULL
          OR extensions.unaccent(coalesce(pc.player_name::text, ''))
             ILIKE '%' || extensions.unaccent(trim(p_q)) || '%'
          OR extensions.unaccent(coalesce(pc.position::text, ''))
             ILIKE '%' || extensions.unaccent(trim(p_q)) || '%'
          OR extensions.unaccent(coalesce(pc.card_type::text, ''))
             ILIKE '%' || extensions.unaccent(trim(p_q)) || '%'
          OR extensions.unaccent(coalesce(pc.playing_style::text, ''))
             ILIKE '%' || extensions.unaccent(trim(p_q)) || '%'
          OR extensions.unaccent(coalesce(pc.pack_name::text, ''))
             ILIKE '%' || extensions.unaccent(trim(p_q)) || '%'
        )
    ),
    ordered AS (
      SELECT * FROM filtered f
      ORDER BY
        CASE WHEN v_sort = 'ovr_desc' THEN f.overall_level_1 END DESC NULLS LAST,
        CASE WHEN v_sort = 'role_asc' THEN f.position END ASC NULLS LAST,
        f.player_name ASC NULLS LAST
      LIMIT lim OFFSET off
    )
    SELECT jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM filtered),
      'rows', COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM ordered o), '[]'::jsonb)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_player_catalog_search(text, text, text, int, int) IS
  'Ricerca player_catalog con unaccent su nome/ruolo/tipo/stile/pack; totale coerente con filtri.';

GRANT EXECUTE ON FUNCTION public.rpc_player_catalog_search(text, text, text, int, int)
  TO anon, authenticated, service_role;
