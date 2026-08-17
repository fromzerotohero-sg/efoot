-- Antonio Conte v6 (EFHub source_coach_id 17609097478250)
-- The catalog import contained competences/boosters but omitted both Link-up Plays.
with conte_data as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'Over-the-Top Pass C',
      'description', null,
      'focal_point', jsonb_build_object('playing_style', 'Build Up', 'position', 'DC'),
      'key_man', jsonb_build_object('playing_style', 'Prolific Winger', 'position', 'ESA/EDA')
    ),
    jsonb_build_object(
      'name', '1-2 Cut-in B',
      'description', null,
      'focal_point', jsonb_build_object('playing_style', 'Prolific Winger', 'position', 'ESA/EDA'),
      'key_man', jsonb_build_object('playing_style', 'Fox in the Box', 'position', 'P')
    )
  ) as plays
)
update public.coach_catalog as catalog
set
  connection = conte_data.plays -> 0,
  coach_payload = coalesce(catalog.coach_payload, '{}'::jsonb)
    || jsonb_build_object(
      'connection', conte_data.plays -> 0,
      'extracted_data',
        coalesce(catalog.coach_payload -> 'extracted_data', '{}'::jsonb)
        || jsonb_build_object(
          'link_up_plays', conte_data.plays,
          'v6_link_up_source', 'verified_catalog_backfill'
        )
    ),
  metadata = coalesce(catalog.metadata, '{}'::jsonb)
    || jsonb_build_object('link_up_plays_verified', true)
from conte_data
where catalog.source = 'efhub'
  and catalog.source_coach_id = '17609097478250';

-- Propagate the corrected catalog facts to already imported copies of this exact card.
with conte_data as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'Over-the-Top Pass C',
      'description', null,
      'focal_point', jsonb_build_object('playing_style', 'Build Up', 'position', 'DC'),
      'key_man', jsonb_build_object('playing_style', 'Prolific Winger', 'position', 'ESA/EDA')
    ),
    jsonb_build_object(
      'name', '1-2 Cut-in B',
      'description', null,
      'focal_point', jsonb_build_object('playing_style', 'Prolific Winger', 'position', 'ESA/EDA'),
      'key_man', jsonb_build_object('playing_style', 'Fox in the Box', 'position', 'P')
    )
  ) as plays
)
update public.coaches as coach
set
  connection = conte_data.plays -> 0,
  extracted_data = coalesce(coach.extracted_data, '{}'::jsonb)
    || jsonb_build_object(
      'connection', conte_data.plays -> 0,
      'link_up_plays', conte_data.plays,
      'v6_link_up_source', 'verified_catalog_backfill',
      'v6_link_up_updated_at', now()
    ),
  updated_at = now()
from conte_data
where coach.extracted_data -> 'source_catalog' ->> 'source' = 'efhub'
  and coach.extracted_data -> 'source_catalog' ->> 'source_coach_id' = '17609097478250';
