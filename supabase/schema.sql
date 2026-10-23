-- BoxBlast database. SAFE TO RUN AGAIN AND AGAIN: it only creates what is missing and never deletes
-- or resets any player data. Run it in Supabase -> SQL Editor BEFORE deploying a new version.

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

-- v3 additions (levels, box designs, stats). Existing rows keep every value they already have.
alter table public.players add column if not exists skin text not null default 'classic';
alter table public.players add column if not exists total_blasts bigint not null default 0;

alter table public.players add column if not exists gems jsonb not null default '{}'::jsonb;

create index if not exists players_earned_idx on public.players (total_earned desc);
create index if not exists players_ref_idx on public.players (referred_by);

create table if not exists public.ad_events (
  id bigserial primary key,
  tg_id bigint not null,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ad_events_lookup on public.ad_events (tg_id, claimed, created_at);
alter table public.ad_events add column if not exists network text not null default 'adsgram';
alter table public.ad_events add column if not exists ymid text;
create unique index if not exists ad_events_ymid_uidx on public.ad_events (network, ymid) where ymid is not null;

-- Lock the tables: only the server (service role key) can read or write.
alter table public.players enable row level security;
alter table public.ad_events enable row level security;

-- Protection against accidental data loss: a player row can never be deleted by the app's API key.
-- (The service role bypasses RLS, so this trigger blocks deletes from the app code as well.
--  To remove a player on purpose, e.g. a privacy request, run:  set session boxblast.allow_delete = 'on';  first.)
create or replace function public.protect_players() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('boxblast.allow_delete', true), '') <> 'on' then
    raise exception 'players rows are protected from deletion';
  end if;
  return old;
end $$;
drop trigger if exists protect_players_delete on public.players;
create trigger protect_players_delete before delete on public.players
  for each row execute function public.protect_players();

-- Balances can never go negative.
do $$ begin
  alter table public.players add constraint players_coins_nonneg check (coins >= 0);
exception when duplicate_object then null; end $$;

-- Optional cleanup of old ad confirmations (ad_events only, never players):
-- delete from public.ad_events where created_at < now() - interval '2 days';
