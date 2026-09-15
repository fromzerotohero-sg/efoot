-- eFootball v6 Fluid Formation support.
-- ADDITIVE ONLY: does not alter or migrate formation_layout or player slots.

create table if not exists public.formation_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null check (phase in ('attack', 'defense')),
  formation text not null,
  slot_positions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  source_version text not null default 'v6.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint formation_variants_user_phase_unique unique (user_id, phase)
);

create index if not exists idx_formation_variants_user_active
  on public.formation_variants (user_id, is_active);

alter table public.formation_variants enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'formation_variants'
      and policyname = 'Users can manage own formation variants'
  ) then
    create policy "Users can manage own formation variants"
      on public.formation_variants
      for all
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;

comment on table public.formation_variants is
  'Optional eFootball v6 attack/defense layouts for the same starting XI. formation_layout remains the backward-compatible base layout.';
comment on column public.formation_variants.phase is
  'Fluid Formation phase: attack or defense.';
comment on column public.formation_variants.slot_positions is
  'Alternative coordinates/roles for existing starter slot indexes 0-10; does not assign or duplicate players.';
