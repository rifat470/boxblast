-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.players (
  tg_id bigint primary key,
  first_name text,
  username text,
  coins bigint not null default 0,
  total_earned bigint not null default 0,
  energy int not null default 500,
  energy_updated_at timestamptz not null default now(),
  tap_level int not null default 1,
  energy_level int not null default 1,
  regen_level int not null default 1,
  pph bigint not null default 0,
  last_collect timestamptz not null default now(),
  cards jsonb not null default '{}'::jsonb,
  claimed jsonb not null default '{}'::jsonb,
  streak int not null default 0,
  last_daily date,
  referred_by bigint references public.players(tg_id),
  ref_count int not null default 0,
  ads_date date,
  ads_today int not null default 0,
  last_ad_at timestamptz,
  last_sync_at timestamptz not null default now(),
  version int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists players_earned_idx on public.players (total_earned desc);
create index if not exists players_ref_idx on public.players (referred_by);

create table if not exists public.ad_events (
  id bigserial primary key,
  tg_id bigint not null,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ad_events_lookup on public.ad_events (tg_id, claimed, created_at);

-- Lock the tables: only the server (service role key) can read or write.
alter table public.players enable row level security;
alter table public.ad_events enable row level security;

-- Optional cleanup of old ad confirmations (run weekly, or schedule with pg_cron):
-- delete from public.ad_events where created_at < now() - interval '2 days';
