-- APPLIED TO PRODUCTION (owner-approved): 2026-08-17
-- Migration name on Supabase: player_catalog_playing_styles_v6_payload
-- Also ran: SELECT public.refresh_player_catalog_payloads(); → 5993 rows updated.
--
-- PREPARED ONLY — DO NOT APPLY TO PRODUCTION WITHOUT OWNER APPROVAL.
--
-- Purpose:
--   Extend refresh_player_catalog_payloads() so players_payload carries the
--   additive dual Playing Style contract stored in player_catalog.metadata.playing_styles.
--
-- Contract (additive, backward-compatible):
--   metadata.playing_styles = {
--     format: 'single' | 'dual',
--     attack: '<EN style name without Att:>' | null,
--     defense: '<EN style name without Def:>' | null,  -- keep "Basic" as-is
--     primary: same as attack / sole legacy style,
--     source_raw?: string[]
--   }
--
-- Legacy column player_catalog.playing_style remains the PRIMARY/ATTACK style
-- WITHOUT phase prefix (e.g. "Hole Player"), so existing consumers keep working.
--
-- This migration does NOT:
--   - add new columns
--   - rewrite historical rows
--   - reimport PESDB
--   - invent Def styles for cards that never had them
--
-- After apply (owner-approved), new/rescraped dual cards will have:
--   players_payload.playing_styles
--   players_payload.metadata.playing_styles
-- until then, app/api/player-catalog/search/route.js synthesizes the contract
-- from catalog.metadata + playing_style at read time.

CREATE OR REPLACE FUNCTION public.refresh_player_catalog_payloads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  updated_count integer;
begin
  update public.player_catalog pc
  set
    players_base_stats = public.player_catalog_stats_to_players_base_stats(coalesce(pc.base_stats, '{}'::jsonb)),
    players_payload = jsonb_strip_nulls(jsonb_build_object(
      'catalog_player_id', pc.id,
      'player_identity_id', pc.player_identity_id,
      'player_identity_key', pc.player_identity_key,
      'card_instance_key', pc.card_instance_key,
      'card_variant_label', pc.card_variant_label,
      'source', pc.source,
      'source_player_id', pc.source_player_id,
      'source_url', pc.source_url,
      'player_name', pc.player_name,
      'position', pc.position,
      'card_type', pc.card_type,
      'team', pc.team_name,
      'club_name', pc.team_name,
      'nationality', pc.nationality,
      'overall_rating', coalesce(pc.overall_max_level, pc.overall_level_1),
      'overall_level_1', pc.overall_level_1,
      'overall_max_level', pc.overall_max_level,
      'height_cm', pc.height,
      'weight_kg', pc.weight,
      'age', pc.age,
      'role', pc.playing_style,
      'playing_style', pc.playing_style,
      'playing_styles', coalesce(
        pc.metadata->'playing_styles',
        jsonb_build_object(
          'format', 'single',
          'attack', pc.playing_style,
          'defense', null,
          'primary', pc.playing_style
        )
      ),
      'base_stats', public.player_catalog_stats_to_players_base_stats(coalesce(pc.base_stats, '{}'::jsonb)),
      'skills', to_jsonb(coalesce(pc.player_skills, array[]::text[])),
      'com_skills', to_jsonb(coalesce(pc.ai_playstyles, array[]::text[])),
      'original_positions', coalesce((select jsonb_agg(jsonb_build_object('position', key, 'competence', 'Alta')) from jsonb_each(coalesce(pc.position_compatibility, '{}'::jsonb))), jsonb_build_array(jsonb_build_object('position', pc.position, 'competence', 'Alta'))),
      'available_boosters', '[]'::jsonb,
      'photo_slots', jsonb_build_object('catalog', true),
      'metadata', jsonb_build_object(
        'source', pc.source,
        'source_player_id', pc.source_player_id,
        'source_section', pc.source_section,
        'pack_name', pc.pack_name,
        'card_category', pc.card_category,
        'weak_foot_usage', pc.weak_foot_usage,
        'weak_foot_accuracy', pc.weak_foot_accuracy,
        'injury_resistance', pc.injury_resistance,
        'source_card_front_url', pc.source_card_front_url,
        'avatar_style', pc.avatar_style,
        'variant_signature', pc.variant_signature,
        'playing_styles', coalesce(
          pc.metadata->'playing_styles',
          jsonb_build_object(
            'format', 'single',
            'attack', pc.playing_style,
            'defense', null,
            'primary', pc.playing_style
          )
        )
      )
    )),
    updated_at = now()
  where pc.id is not null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$function$;

COMMENT ON FUNCTION public.refresh_player_catalog_payloads() IS
  'Rebuilds players_payload; includes additive metadata.playing_styles for eFootball v6 dual ATT/DEF when present.';
