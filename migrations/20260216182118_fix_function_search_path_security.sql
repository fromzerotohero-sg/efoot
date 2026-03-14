-- Sicurezza: funzioni con search_path non impostato (advisor Supabase).
-- Imposta search_path = public per evitare manipolazione del search_path a livello ruolo.
ALTER FUNCTION public.update_coaches_updated_at() SET search_path = public;
ALTER FUNCTION public.update_opponent_formations_updated_at() SET search_path = public;
ALTER FUNCTION public.set_initial_division() SET search_path = public;
ALTER FUNCTION public.update_user_credit_usage_updated_at() SET search_path = public;
ALTER FUNCTION public.update_weekly_goals_updated_at() SET search_path = public;
ALTER FUNCTION public.update_team_tactical_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.atomic_slot_assignment(uuid, integer, uuid) SET search_path = public;
ALTER FUNCTION public.calculate_profile_completion_score() SET search_path = public;
ALTER FUNCTION public.cleanup_orphan_individual_instructions() SET search_path = public;
ALTER FUNCTION public.update_matches_updated_at() SET search_path = public;
