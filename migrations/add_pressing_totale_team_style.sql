-- eFootball v6.0.0 sixth Team Playstyle: Pressing totale (EN Overload).
-- Production already has this CHECK as of 20260817193159
-- (allow_pressing_totale_team_playing_style). This file is idempotent:
-- it does nothing if pressing_totale is already allowed. No data rewrite.

DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO def
  FROM pg_constraint
  WHERE conrelid = 'public.team_tactical_settings'::regclass
    AND conname = 'team_tactical_settings_team_playing_style_check';

  IF def IS NOT NULL AND def ILIKE '%pressing_totale%' THEN
    RAISE NOTICE 'team_playing_style CHECK already allows pressing_totale; skipping';
    RETURN;
  END IF;

  ALTER TABLE public.team_tactical_settings
    DROP CONSTRAINT IF EXISTS team_tactical_settings_team_playing_style_check;

  ALTER TABLE public.team_tactical_settings
    ADD CONSTRAINT team_tactical_settings_team_playing_style_check
    CHECK (
      team_playing_style IS NULL
      OR team_playing_style IN (
        'possesso_palla',
        'contropiede_veloce',
        'contrattacco',
        'vie_laterali',
        'passaggio_lungo',
        'pressing_totale'
      )
    );
END $$;
