-- Allineamento RPC classifica: stesso fallback dell'API (nickname → first_name → '—').
-- La classifica non usa mai snapshot per il nome: sempre user_profiles.
CREATE OR REPLACE FUNCTION public.get_leaderboard_for_month(month_param text)
 RETURNS TABLE(rank integer, nickname text, points integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.rank::int,
    COALESCE(
      NULLIF(TRIM(p.nickname), ''),
      NULLIF(TRIM(p.first_name), ''),
      '—'
    )::text,
    s.points::int
  FROM leaderboard_snapshots s
  LEFT JOIN user_profiles p ON p.user_id = s.user_id
  WHERE s.month = month_param
  ORDER BY s.rank ASC;
$function$;
