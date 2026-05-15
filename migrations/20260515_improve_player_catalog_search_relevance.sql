CREATE OR REPLACE FUNCTION public.rpc_player_catalog_search(
  p_q text,
  p_card_type text,
  p_sort text,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_sort text := trim(coalesce(p_sort, 'name_asc'));
  v_q text := trim(coalesce(p_q, ''));
  v_q_unaccent text := extensions.unaccent(trim(coalesce(p_q, '')));
  lim int := greatest(1, least(coalesce(p_limit, 24), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT
        pc.*,
        extensions.unaccent(coalesce(pc.player_name::text, '')) AS search_name,
        extensions.unaccent(coalesce(pc.position::text, '')) AS search_position,
        extensions.unaccent(coalesce(pc.card_type::text, '')) AS search_card_type,
        extensions.unaccent(coalesce(pc.playing_style::text, '')) AS search_playing_style,
        extensions.unaccent(coalesce(pc.pack_name::text, '')) AS search_pack_name
      FROM public.player_catalog pc
      WHERE pc.source = 'pesdb'
        AND pc.catalog_ready IS TRUE
        AND pc.needs_review IS FALSE
        AND (nullif(trim(p_card_type), '') IS NULL OR pc.card_type = trim(p_card_type))
    ),
    matched AS (
      SELECT
        f.*,
        CASE
          WHEN v_q = '' THEN 0
          WHEN f.search_name ILIKE v_q_unaccent || '%' THEN 0
          WHEN f.search_name ILIKE '% ' || v_q_unaccent || '%' THEN 1
          WHEN f.search_name ILIKE '%' || v_q_unaccent || '%' THEN 2
          WHEN length(v_q) >= 3 AND f.search_position ILIKE '%' || v_q_unaccent || '%' THEN 3
          WHEN length(v_q) >= 3 AND f.search_card_type ILIKE '%' || v_q_unaccent || '%' THEN 4
          WHEN length(v_q) >= 3 AND f.search_playing_style ILIKE '%' || v_q_unaccent || '%' THEN 5
          WHEN length(v_q) >= 3 AND f.search_pack_name ILIKE '%' || v_q_unaccent || '%' THEN 6
          ELSE 99
        END AS relevance_rank
      FROM filtered f
      WHERE v_q = ''
        OR f.search_name ILIKE '%' || v_q_unaccent || '%'
        OR (
          length(v_q) >= 3
          AND (
            f.search_position ILIKE '%' || v_q_unaccent || '%'
            OR f.search_card_type ILIKE '%' || v_q_unaccent || '%'
            OR f.search_playing_style ILIKE '%' || v_q_unaccent || '%'
            OR f.search_pack_name ILIKE '%' || v_q_unaccent || '%'
          )
        )
    ),
    ordered AS (
      SELECT *
      FROM matched m
      ORDER BY
        m.relevance_rank ASC,
        CASE WHEN v_sort = 'ovr_desc' THEN m.overall_level_1 END DESC NULLS LAST,
        CASE WHEN v_sort = 'role_asc' THEN m.position END ASC NULLS LAST,
        CASE WHEN v_sort = 'name_asc' AND v_q <> '' THEN m.overall_level_1 END DESC NULLS LAST,
        m.player_name ASC NULLS LAST
      LIMIT lim OFFSET off
    )
    SELECT jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM matched),
      'rows', COALESCE(
        (
          SELECT jsonb_agg(
            to_jsonb(o)
              - 'search_name'
              - 'search_position'
              - 'search_card_type'
              - 'search_playing_style'
              - 'search_pack_name'
              - 'relevance_rank'
          )
          FROM ordered o
        ),
        '[]'::jsonb
      )
    )
  );
END;
$function$;
