-- =============================================================
-- Migration: cleanup_duplicate_constraint_and_fix_rls
-- Già applicata su Supabase via MCP il 2026-02-13.
--
-- 1. Drop duplicate UNIQUE constraint on player_performance_aggregates
-- 2. Add missing DELETE policy on user_diagnostic_cache
-- 3. Add missing DELETE policy on user_game_analysis
-- =============================================================

-- 1. DROP DUPLICATE CONSTRAINT (keeps player_performance_aggregates_user_player_key)
ALTER TABLE public.player_performance_aggregates
  DROP CONSTRAINT IF EXISTS unique_user_player;

-- 2. MISSING RLS: user_diagnostic_cache DELETE
CREATE POLICY "user_diagnostic_cache_delete_own"
  ON public.user_diagnostic_cache FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 3. MISSING RLS: user_game_analysis DELETE
CREATE POLICY "Users can delete own game analysis"
  ON public.user_game_analysis FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
