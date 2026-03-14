-- Aggiunge 'clean_sheet_matches' ai valori ammessi per weekly_goals.goal_type.
-- Rimuove 'improve_defense' e 'use_recommended_formation' dai nuovi inserimenti
-- (i task esistenti con quei tipi restano; il codice non li genera più).

ALTER TABLE weekly_goals
  DROP CONSTRAINT IF EXISTS weekly_goals_goal_type_check;

ALTER TABLE weekly_goals
  ADD CONSTRAINT weekly_goals_goal_type_check CHECK (goal_type = ANY (ARRAY[
    'reduce_goals_conceded'::text,
    'increase_wins'::text,
    'improve_possession'::text,
    'complete_matches'::text,
    'clean_sheet_matches'::text,
    'use_ai_recommendations'::text,
    'custom'::text,
    -- Retrocompatibilità: task già presenti in DB
    'use_recommended_formation'::text,
    'improve_defense'::text
  ]));

COMMENT ON COLUMN weekly_goals.goal_type IS 'Tipo obiettivo. clean_sheet_matches = partite senza gol subiti; use_recommended_formation e improve_defense non più generati.';
