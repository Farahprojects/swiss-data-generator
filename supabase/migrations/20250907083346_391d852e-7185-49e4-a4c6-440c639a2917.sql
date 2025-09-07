
-- 1) New table for per-block summaries
CREATE TABLE IF NOT EXISTS public.message_block_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  block_index INTEGER NOT NULL CHECK (block_index >= 0),
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  start_message_id UUID,
  end_message_id UUID,
  model TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_chat_block UNIQUE (chat_id, block_index)
);

-- Helpful index for lookups by chat
CREATE INDEX IF NOT EXISTS idx_message_block_summaries_chat_block
  ON public.message_block_summaries (chat_id, block_index);

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_message_block_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_message_block_summaries_updated_at ON public.message_block_summaries;
CREATE TRIGGER update_message_block_summaries_updated_at
BEFORE UPDATE ON public.message_block_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_message_block_summaries_updated_at();

-- 2) Enable RLS
ALTER TABLE public.message_block_summaries ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies

-- 3a) Service role can manage everything (used by Edge Functions/background jobs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'message_block_summaries' 
      AND policyname = 'service_role_manage_message_block_summaries'
  ) THEN
    CREATE POLICY "service_role_manage_message_block_summaries"
      ON public.message_block_summaries
      AS PERMISSIVE
      FOR ALL
      TO public
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 3b) Anonymous users: can read summaries for guest chats (mirror messages table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'message_block_summaries' 
      AND policyname = 'anon_read_guest_chat_summaries'
  ) THEN
    CREATE POLICY "anon_read_guest_chat_summaries"
      ON public.message_block_summaries
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING (
        chat_id IN (
          SELECT gr.chat_id
          FROM public.guest_reports gr
          WHERE gr.chat_id = message_block_summaries.chat_id
        )
      );
  END IF;
END $$;

-- 3c) Authenticated users: can read summaries for their own conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'message_block_summaries' 
      AND policyname = 'auth_read_own_conversation_summaries'
  ) THEN
    CREATE POLICY "auth_read_own_conversation_summaries"
      ON public.message_block_summaries
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (
        chat_id IN (
          SELECT c.id
          FROM public.conversations c
          WHERE c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3d) Authenticated users: can read summaries for their own guest chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'message_block_summaries' 
      AND policyname = 'auth_read_own_guest_chat_summaries'
  ) THEN
    CREATE POLICY "auth_read_own_guest_chat_summaries"
      ON public.message_block_summaries
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (
        chat_id IN (
          SELECT gr.chat_id
          FROM public.guest_reports gr
          WHERE gr.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4) Optional: add an index to speed up block computation from messages
-- (safe to create even if it already exists)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at
  ON public.messages (chat_id, created_at);
