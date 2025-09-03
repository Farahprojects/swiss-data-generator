
-- Ensure realtime publishes changes for the messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END$$;

-- Ensure updates emit full row content in realtime payloads
ALTER TABLE public.messages REPLICA IDENTITY FULL;
