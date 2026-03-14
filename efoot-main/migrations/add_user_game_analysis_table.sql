-- Statistiche Analisi eFootball (ultime 10 partite): tipo gol, tiro, passaggio, dribbling, difesa, comandi speciali.
-- Un record per utente: nuovo caricamento sovrascrive il precedente.
CREATE TABLE IF NOT EXISTS user_game_analysis (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stats jsonb NOT NULL DEFAULT '{}',
  captured_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_game_analysis IS 'Last uploaded eFootball Analisi stats (goal types, shot, passing, dribbling, defense). One row per user; new upload overwrites.';
COMMENT ON COLUMN user_game_analysis.stats IS 'Extracted stats: goal_types, shot_usage, passing, dribbling, defense, special_commands (percentages/counts).';
COMMENT ON COLUMN user_game_analysis.captured_at IS 'When the analysis was captured (upload time).';

ALTER TABLE user_game_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game analysis"
  ON user_game_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game analysis"
  ON user_game_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game analysis"
  ON user_game_analysis FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
