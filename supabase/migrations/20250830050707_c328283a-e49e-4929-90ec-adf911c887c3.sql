
-- 1) Create temp_audio table (one row per session)
create table if not exists public.temp_audio (
  session_id text primary key,
  audio_data bytea not null,
  updated_at timestamptz not null default now()
);

-- 2) Make updates emit full row (useful for realtime UPDATE events)
alter table public.temp_audio replica identity full;

-- 3) Add to realtime publication (harmless if already managed automatically)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'temp_audio'
  ) then
    alter publication supabase_realtime add table public.temp_audio;
  end if;
end
$$;

-- 4) Optional: RLS (service role writes; allow read for realtime consumers)
--    If you prefer stricter policies, we can update later to gate by user/session strategy.
alter table public.temp_audio enable row level security;

-- Service role full access (edge function writes with service role)
create policy if not exists "service_role_manage_temp_audio"
  on public.temp_audio
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Allow SELECT for realtime consumers (anonymous clients only listen to events; no direct selects are used)
-- This is permissive; tighten later if you add auth-bound sessions.
create policy if not exists "anon_can_select_temp_audio"
  on public.temp_audio
  for select
  using (true);
