-- Allow eFootball v6 Overload persistence.
-- Internal ID stays pressing_totale. Public label stays Overload.
-- Schema-only: no data rewrite, no user conversion.

BEGIN;

ALTER TABLE public.team_tactical_settings
  DROP CONSTRAINT IF EXISTS team_tactical_settings_team_playing_style_check;

ALTER TABLE public.team_tactical_settings
  ADD CONSTRAINT team_tactical_settings_team_playing_style_check
  CHECK (
    team_playing_style = ANY (
      ARRAY[
        'possesso_palla'::text,
        'contropiede_veloce'::text,
        'contrattacco'::text,
        'vie_laterali'::text,
        'passaggio_lungo'::text,
        'pressing_totale'::text
      ]
    )
  );

COMMIT;
