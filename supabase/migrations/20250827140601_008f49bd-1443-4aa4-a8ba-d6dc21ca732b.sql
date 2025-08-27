
-- 1) Create a dedicated table for TTS audio clips
create table if not exists public.chat_audio_clips (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null,
  -- Optional reference to a message this audio was generated for (if applicable)
  message_id uuid null,
  role text not null default 'assistant',
  text text null,                     -- The text that was synthesized
  audio_url text not null,            -- Direct URL or data: URL for immediate playback
  storage_path text null,             -- If uploaded to storage, keep the path here
  mime_type text not null default 'audio/mpeg',
  duration_ms integer null,
  voice text null,
  provider text not null default 'google',
  session_id text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) Enable Row Level Security
alter table public.chat_audio_clips enable row level security;

-- 3) Service role can manage everything
drop policy if exists service_role_manage_chat_audio_clips on public.chat_audio_clips;
create policy service_role_manage_chat_audio_clips
  on public.chat_audio_clips
  as permissive
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 4) Anonymous users can read audio for guest chats
--    This mirrors the anonymous access pattern used for messages in guest reports
drop policy if exists anon_read_guest_chat_audio on public.chat_audio_clips;
create policy anon_read_guest_chat_audio
  on public.chat_audio_clips
  as permissive
  for select
  using (
    chat_id in (
      select gr.chat_id
      from public.guest_reports gr
      where gr.chat_id = chat_audio_clips.chat_id
    )
  );

-- 5) Authenticated users can read audio for their own conversations
drop policy if exists auth_read_own_conversation_audio on public.chat_audio_clips;
create policy auth_read_own_conversation_audio
  on public.chat_audio_clips
  as permissive
  for select
  using (
    chat_id in (
      select c.id
      from public.conversations c
      where c.user_id = auth.uid()
    )
  );

-- 6) Authenticated users can read audio for their own guest chats (if guest_reports are attached)
drop policy if exists auth_read_own_guest_chat_audio on public.chat_audio_clips;
create policy auth_read_own_guest_chat_audio
  on public.chat_audio_clips
  as permissive
  for select
  using (
    chat_id in (
      select gr.chat_id
      from public.guest_reports gr
      where gr.user_id = auth.uid()
    )
  );

-- 7) Helpful indexes for lookups and realtime consumers
create index if not exists idx_chat_audio_clips_chat_id_created_at
  on public.chat_audio_clips (chat_id, created_at desc);

-- 8) Realtime configuration (so the frontend can subscribe to inserts)
-- Note: REPLICA IDENTITY FULL helps with UPDATE events; we primarily use INSERTs but it's safe to set.
alter table public.chat_audio_clips replica identity full;

-- Add the table to the realtime publication (no-op if already present in some stacks)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.chat_audio_clips';
    exception
      when duplicate_object then
        -- already added
        null;
    end;
  end if;
end $$;
