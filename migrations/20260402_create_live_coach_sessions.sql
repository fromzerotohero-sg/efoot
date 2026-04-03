BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.live_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  language text NOT NULL DEFAULT 'it',
  status text NOT NULL DEFAULT 'starting',
  realtime_model text NOT NULL DEFAULT 'gpt-realtime',
  voice text NOT NULL DEFAULT 'cedar',
  source text NOT NULL DEFAULT 'live_coach',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_count integer NOT NULL DEFAULT 0,
  minute_blocks_billed integer NOT NULL DEFAULT 0,
  start_cost_hp integer NOT NULL DEFAULT 0,
  minute_cost_hp integer NOT NULL DEFAULT 0,
  total_hp_charged integer NOT NULL DEFAULT 0,
  user_context jsonb NULL DEFAULT '{}'::jsonb,
  opponent_context jsonb NULL DEFAULT '{}'::jsonb,
  session_meta jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_coach_sessions_user_id
  ON public.live_coach_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_coach_sessions_status
  ON public.live_coach_sessions (status, created_at DESC);

ALTER TABLE public.live_coach_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own live coach sessions" ON public.live_coach_sessions;
CREATE POLICY "Users can read own live coach sessions"
  ON public.live_coach_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own live coach sessions" ON public.live_coach_sessions;
CREATE POLICY "Users can insert own live coach sessions"
  ON public.live_coach_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own live coach sessions" ON public.live_coach_sessions;
CREATE POLICY "Users can update own live coach sessions"
  ON public.live_coach_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
