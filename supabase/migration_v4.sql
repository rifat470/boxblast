-- BoxBlast v4 migration. SAFE TO RUN MANY TIMES: it only adds what is missing and never deletes or resets player data.
-- Supabase -> SQL Editor -> New query -> paste everything -> Run.

alter table public.players add column if not exists gems jsonb not null default '{}'::jsonb;

-- Old box-design ids ('classic', 'ocean', ...) are replaced by 'lv1'..'lv10'.
-- The server ignores old values and automatically shows the newest unlocked design, so nothing needs converting.
-- (Optional tidy-up, safe: sets everyone to the default design again)
-- update public.players set skin = 'lv1' where skin not like 'lv%';
