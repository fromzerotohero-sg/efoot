-- Additive zone contract. Does not replace attack_areas_avg or change existing writers.
-- our_attack_areas_avg = user attack
-- opponent_attack_areas_avg = opponent attack / pressure conceded (NOT conceded goals)
-- conceded_goal_zones(_avg) = reserved until goal locations exist

ALTER TABLE public.team_tactical_patterns
  ADD COLUMN IF NOT EXISTS our_attack_areas_avg jsonb,
  ADD COLUMN IF NOT EXISTS opponent_attack_areas_avg jsonb,
  ADD COLUMN IF NOT EXISTS conceded_goal_zones_avg jsonb;

COMMENT ON COLUMN public.team_tactical_patterns.attack_areas_avg IS
  'LEGACY unlabeled mix. Prefer our_attack_areas_avg and opponent_attack_areas_avg. Do not treat as conceded-goal zones.';

COMMENT ON COLUMN public.team_tactical_patterns.our_attack_areas_avg IS
  'Average user attack zones from matches.attack_areas (team1 if home).';

COMMENT ON COLUMN public.team_tactical_patterns.opponent_attack_areas_avg IS
  'Average opponent attack / pressure conceded. NOT conceded-goal locations.';

COMMENT ON COLUMN public.team_tactical_patterns.conceded_goal_zones_avg IS
  'Reserved for goal-location aggregates. Stay NULL until matches have goal locations. Never copy attack_areas here.';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS conceded_goal_zones jsonb;

COMMENT ON COLUMN public.matches.conceded_goal_zones IS
  'Optional left/center/right of conceded goals. Distinct from attack_areas. NULL until extraction exists.';

WITH recent AS (
  SELECT
    m.user_id,
    m.is_home,
    m.attack_areas,
    m.team_stats,
    row_number() OVER (
      PARTITION BY m.user_id
      ORDER BY m.match_date DESC NULLS LAST, m.created_at DESC
    ) AS rn
  FROM public.matches m
),
picked AS (
  SELECT * FROM recent WHERE rn <= 20
),
split AS (
  SELECT
    user_id,
    CASE
      WHEN attack_areas ? 'cliente' THEN attack_areas->'cliente'
      WHEN COALESCE(is_home, true) AND attack_areas ? 'team1' THEN attack_areas->'team1'
      WHEN COALESCE(is_home, true) IS FALSE AND attack_areas ? 'team2' THEN attack_areas->'team2'
      WHEN attack_areas ? 'left' OR attack_areas ? 'center' OR attack_areas ? 'right' THEN attack_areas
      ELSE NULL
    END AS ours,
    CASE
      WHEN attack_areas ? 'avversario' THEN attack_areas->'avversario'
      WHEN COALESCE(is_home, true) AND attack_areas ? 'team2' THEN attack_areas->'team2'
      WHEN COALESCE(is_home, true) IS FALSE AND attack_areas ? 'team1' THEN attack_areas->'team1'
      ELSE NULL
    END AS theirs,
    NULLIF(team_stats->>'goals_scored', '')::numeric AS gs,
    NULLIF(team_stats->>'goals_conceded', '')::numeric AS gc
  FROM picked
),
agg AS (
  SELECT
    user_id,
    SUM(COALESCE((ours->>'left')::numeric, 0)) AS o_l,
    SUM(COALESCE((ours->>'center')::numeric, 0)) AS o_c,
    SUM(COALESCE((ours->>'right')::numeric, 0)) AS o_r,
    SUM(COALESCE((theirs->>'left')::numeric, 0)) AS t_l,
    SUM(COALESCE((theirs->>'center')::numeric, 0)) AS t_c,
    SUM(COALESCE((theirs->>'right')::numeric, 0)) AS t_r,
    SUM(COALESCE(gs, 0)) AS total_gs,
    SUM(COALESCE(gc, 0)) AS total_gc
  FROM split
  GROUP BY user_id
)
UPDATE public.team_tactical_patterns p
SET
  our_attack_areas_avg = CASE
    WHEN a.o_l + a.o_c + a.o_r > 0 THEN jsonb_build_object(
      'left', ROUND(100 * a.o_l / (a.o_l + a.o_c + a.o_r)),
      'center', ROUND(100 * a.o_c / (a.o_l + a.o_c + a.o_r)),
      'right', ROUND(100 * a.o_r / (a.o_l + a.o_c + a.o_r))
    )
    ELSE p.our_attack_areas_avg
  END,
  opponent_attack_areas_avg = CASE
    WHEN a.t_l + a.t_c + a.t_r > 0 THEN jsonb_build_object(
      'left', ROUND(100 * a.t_l / (a.t_l + a.t_c + a.t_r)),
      'center', ROUND(100 * a.t_c / (a.t_l + a.t_c + a.t_r)),
      'right', ROUND(100 * a.t_r / (a.t_l + a.t_c + a.t_r))
    )
    ELSE p.opponent_attack_areas_avg
  END,
  total_goals_scored = CASE
    WHEN COALESCE(p.total_goals_scored, 0) = 0 THEN a.total_gs::integer
    ELSE p.total_goals_scored
  END,
  total_goals_conceded = CASE
    WHEN COALESCE(p.total_goals_conceded, 0) = 0 THEN a.total_gc::integer
    ELSE p.total_goals_conceded
  END
FROM agg a
WHERE a.user_id = p.user_id;
