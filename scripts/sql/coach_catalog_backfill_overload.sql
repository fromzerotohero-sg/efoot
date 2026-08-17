-- Prepared backfill only. Do not execute automatically.
-- Copies a valid raw EFHub OverLoad value only when both normalized copies are absent.
WITH candidates AS (
  SELECT
    id,
    to_jsonb((metadata #>> '{raw_skills,OverLoad}')::numeric) AS overload_value
  FROM public.coach_catalog
  WHERE metadata #> '{raw_skills,OverLoad}' IS NOT NULL
    AND jsonb_typeof(metadata #> '{raw_skills,OverLoad}') IN ('number', 'string')
    AND (metadata #>> '{raw_skills,OverLoad}') ~ '^[+-]?[0-9]+([.][0-9]+)?$'
    AND playing_style_competence -> 'pressing_totale' IS NULL
    AND coach_payload #> '{playing_style_competence,pressing_totale}' IS NULL
)
UPDATE public.coach_catalog AS catalog
SET
  playing_style_competence = jsonb_set(
    COALESCE(catalog.playing_style_competence, '{}'::jsonb),
    '{pressing_totale}',
    candidates.overload_value,
    true
  ),
  coach_payload = jsonb_set(
    COALESCE(catalog.coach_payload, '{}'::jsonb),
    '{playing_style_competence}',
    jsonb_set(
      COALESCE(catalog.coach_payload -> 'playing_style_competence', '{}'::jsonb),
      '{pressing_totale}',
      candidates.overload_value,
      true
    ),
    true
  ),
  updated_at = now()
FROM candidates
WHERE catalog.id = candidates.id
  AND catalog.playing_style_competence -> 'pressing_totale' IS NULL
  AND catalog.coach_payload #> '{playing_style_competence,pressing_totale}' IS NULL;
