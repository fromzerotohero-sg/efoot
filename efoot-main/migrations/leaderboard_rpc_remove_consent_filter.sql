-- Allineamento RPC classifica: nessun filtro leaderboard_consent (tutti gli eleggibili in snapshot).
-- Coerenza con API route che non usa il consenso. Audit: docs/AUDIT_COERENZA_ENTERPRISE.md

CREATE OR REPLACE FUNCTION public.get_leaderboard_for_month(month_param text)
 RETURNS TABLE(rank integer, nickname text, points integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.rank::int,
    COALESCE(p.nickname, '—')::text,
    s.points::int
  FROM leaderboard_snapshots s
  LEFT JOIN user_profiles p ON p.user_id = s.user_id
  WHERE s.month = month_param
  ORDER BY s.rank ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_current_user(month_param text, user_id_param uuid)
 RETURNS TABLE(rank integer, points integer, points_breakdown jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.rank::int, s.points::int, s.points_breakdown
  FROM leaderboard_snapshots s
  WHERE s.month = month_param AND s.user_id = user_id_param
  LIMIT 1;
$function$;
