-- Informazioni IA: campi opzionali per arricchire il riassunto (diagnostic). Non usati per ai_knowledge_score.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS connection_quality TEXT,
  ADD COLUMN IF NOT EXISTS slow_opponent_connection_issues TEXT,
  ADD COLUMN IF NOT EXISTS input_delay TEXT,
  ADD COLUMN IF NOT EXISTS pass_level TEXT,
  ADD COLUMN IF NOT EXISTS smart_assist TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS favourite_player_name TEXT,
  ADD COLUMN IF NOT EXISTS ai_weak_point TEXT,
  ADD COLUMN IF NOT EXISTS ai_learn_goals TEXT,
  ADD COLUMN IF NOT EXISTS ai_notes TEXT;

COMMENT ON COLUMN user_profiles.connection_quality IS 'AI info: connection quality. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.slow_opponent_connection_issues IS 'AI info: issues vs slow opponents. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.input_delay IS 'AI info: input delay. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.pass_level IS 'AI info: pass level PA1/PA2/PA3. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.smart_assist IS 'AI info: smart assist yes/no. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.platform IS 'AI info: platform. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.favourite_player_name IS 'AI info: favourite player name. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.ai_weak_point IS 'AI info: weak point. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.ai_learn_goals IS 'AI info: what user wants to learn. Not used for ai_knowledge_score.';
COMMENT ON COLUMN user_profiles.ai_notes IS 'AI info: free notes. Not used for ai_knowledge_score.';
