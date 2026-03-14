-- Performance/Security: usa (select auth.uid()) nelle policy RLS per evitare rivalutazione per riga.
-- Vedi https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- credit_transactions
DROP POLICY IF EXISTS "Users can read own credit transactions" ON credit_transactions;
CREATE POLICY "Users can read own credit transactions" ON credit_transactions FOR SELECT USING ((select auth.uid()) = user_id);

-- opponent_formations
DROP POLICY IF EXISTS "Users can view own opponent formations" ON opponent_formations;
CREATE POLICY "Users can view own opponent formations" ON opponent_formations FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own opponent formations" ON opponent_formations;
CREATE POLICY "Users can insert own opponent formations" ON opponent_formations FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own opponent formations" ON opponent_formations;
CREATE POLICY "Users can update own opponent formations" ON opponent_formations FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own opponent formations" ON opponent_formations;
CREATE POLICY "Users can delete own opponent formations" ON opponent_formations FOR DELETE USING ((select auth.uid()) = user_id);

-- player_performance_aggregates
DROP POLICY IF EXISTS "Users can view own player performance aggregates" ON player_performance_aggregates;
CREATE POLICY "Users can view own player performance aggregates" ON player_performance_aggregates FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own player performance aggregates" ON player_performance_aggregates;
CREATE POLICY "Users can insert own player performance aggregates" ON player_performance_aggregates FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own player performance aggregates" ON player_performance_aggregates;
CREATE POLICY "Users can update own player performance aggregates" ON player_performance_aggregates FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own player performance aggregates" ON player_performance_aggregates;
CREATE POLICY "Users can delete own player performance aggregates" ON player_performance_aggregates FOR DELETE USING ((select auth.uid()) = user_id);

-- team_tactical_patterns
DROP POLICY IF EXISTS "Users can view own team tactical patterns" ON team_tactical_patterns;
CREATE POLICY "Users can view own team tactical patterns" ON team_tactical_patterns FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own team tactical patterns" ON team_tactical_patterns;
CREATE POLICY "Users can insert own team tactical patterns" ON team_tactical_patterns FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own team tactical patterns" ON team_tactical_patterns;
CREATE POLICY "Users can update own team tactical patterns" ON team_tactical_patterns FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own team tactical patterns" ON team_tactical_patterns;
CREATE POLICY "Users can delete own team tactical patterns" ON team_tactical_patterns FOR DELETE USING ((select auth.uid()) = user_id);

-- user_credit_usage
DROP POLICY IF EXISTS "Users can read own credit usage" ON user_credit_usage;
CREATE POLICY "Users can read own credit usage" ON user_credit_usage FOR SELECT USING ((select auth.uid()) = user_id);

-- user_diagnostic_cache
DROP POLICY IF EXISTS "user_diagnostic_cache_select_own" ON user_diagnostic_cache;
CREATE POLICY "user_diagnostic_cache_select_own" ON user_diagnostic_cache FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "user_diagnostic_cache_update_own" ON user_diagnostic_cache;
CREATE POLICY "user_diagnostic_cache_update_own" ON user_diagnostic_cache FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- user_game_analysis
DROP POLICY IF EXISTS "Users can read own game analysis" ON user_game_analysis;
CREATE POLICY "Users can read own game analysis" ON user_game_analysis FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own game analysis" ON user_game_analysis;
CREATE POLICY "Users can insert own game analysis" ON user_game_analysis FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own game analysis" ON user_game_analysis;
CREATE POLICY "Users can update own game analysis" ON user_game_analysis FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- user_prizes
DROP POLICY IF EXISTS "Users can read own prizes" ON user_prizes;
CREATE POLICY "Users can read own prizes" ON user_prizes FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own prizes (redeem)" ON user_prizes;
CREATE POLICY "Users can update own prizes (redeem)" ON user_prizes FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
