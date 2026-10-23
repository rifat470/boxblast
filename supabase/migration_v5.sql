-- BoxBlast v5 migration (Monetag + TADS ad confirmations). SAFE TO RUN MANY TIMES, never deletes player data.
-- Run v4 first if you have not yet (migration_v4.sql). Supabase -> SQL Editor -> New query -> paste -> Run.

alter table public.players add column if not exists gems jsonb not null default '{}'::jsonb;

alter table public.ad_events add column if not exists network text not null default 'adsgram';
alter table public.ad_events add column if not exists ymid text;
create unique index if not exists ad_events_ymid_uidx on public.ad_events (network, ymid) where ymid is not null;
create index if not exists ad_events_lookup2 on public.ad_events (tg_id, network, claimed, created_at);
