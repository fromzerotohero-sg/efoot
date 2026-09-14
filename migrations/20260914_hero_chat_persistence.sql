-- Hero Chat: thread, messaggi, piani pre-partita (contromisure)
-- Additive only. RLS: utente vede/scrive solo i propri record.

CREATE TABLE IF NOT EXISTS public.hero_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface text NOT NULL DEFAULT 'hero-home',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_chat_threads_user_surface_unique UNIQUE (user_id, surface)
);

COMMENT ON TABLE public.hero_chat_threads IS
  'Thread conversazionale Hero Chat (una riga attiva per utente/surface).';

CREATE TABLE IF NOT EXISTS public.hero_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.hero_chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'hero', 'system')),
  content text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hero_chat_messages IS
  'Messaggi Hero Chat con payload strutturato (tips, plan cards, kind).';

CREATE INDEX IF NOT EXISTS idx_hero_chat_messages_thread_created
  ON public.hero_chat_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_hero_chat_messages_user_created
  ON public.hero_chat_messages (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.prematch_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.hero_chat_threads(id) ON DELETE SET NULL,
  opponent_formation_id uuid REFERENCES public.opponent_formations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('draft', 'ready', 'applied', 'failed', 'dismissed')),
  countermeasures jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_set jsonb NOT NULL DEFAULT '{}'::jsonb,
  apply_result jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

COMMENT ON TABLE public.prematch_plans IS
  'Piani contromisure generati in chat: draft/ready → applied dopo conferma esplicita.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_prematch_plans_idempotency
  ON public.prematch_plans (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prematch_plans_user_created
  ON public.prematch_plans (user_id, created_at DESC);

ALTER TABLE public.hero_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prematch_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own hero chat threads" ON public.hero_chat_threads;
CREATE POLICY "Users can view own hero chat threads"
  ON public.hero_chat_threads FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own hero chat threads" ON public.hero_chat_threads;
CREATE POLICY "Users can insert own hero chat threads"
  ON public.hero_chat_threads FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own hero chat threads" ON public.hero_chat_threads;
CREATE POLICY "Users can update own hero chat threads"
  ON public.hero_chat_threads FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own hero chat messages" ON public.hero_chat_messages;
CREATE POLICY "Users can view own hero chat messages"
  ON public.hero_chat_messages FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own hero chat messages" ON public.hero_chat_messages;
CREATE POLICY "Users can insert own hero chat messages"
  ON public.hero_chat_messages FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own hero chat messages" ON public.hero_chat_messages;
CREATE POLICY "Users can delete own hero chat messages"
  ON public.hero_chat_messages FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own prematch plans" ON public.prematch_plans;
CREATE POLICY "Users can view own prematch plans"
  ON public.prematch_plans FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own prematch plans" ON public.prematch_plans;
CREATE POLICY "Users can insert own prematch plans"
  ON public.prematch_plans FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own prematch plans" ON public.prematch_plans;
CREATE POLICY "Users can update own prematch plans"
  ON public.prematch_plans FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);
