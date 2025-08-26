
-- Speed up chat history queries and message correlation
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at
  ON public.messages (chat_id, created_at)
  INCLUDE (role, text);

CREATE INDEX IF NOT EXISTS idx_messages_client_msg_id
  ON public.messages (client_msg_id);

-- Help RLS subselects and client-side reads for guest chats
CREATE INDEX IF NOT EXISTS idx_guest_reports_chat_id
  ON public.guest_reports (chat_id);

-- Optional: ensure the messages table is configured for realtime with full row images
DO $$
BEGIN
  -- REPLICA IDENTITY FULL is idempotent; set without failing if already applied
  BEGIN
    EXECUTE 'ALTER TABLE public.messages REPLICA IDENTITY FULL';
  EXCEPTION WHEN others THEN
    -- Ignore if already set or not applicable
    NULL;
  END;

  -- Add to supabase_realtime publication; ignore if it's already present
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END$$;
