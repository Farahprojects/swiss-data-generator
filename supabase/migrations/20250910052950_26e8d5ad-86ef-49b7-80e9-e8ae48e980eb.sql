-- Drop policies that depend on guest_reports.chat_id
DROP POLICY IF EXISTS "anon_read_guest_chat_audio" ON chat_audio_clips;
DROP POLICY IF EXISTS "auth_read_own_guest_chat_audio" ON chat_audio_clips;
DROP POLICY IF EXISTS "anon_read_guest_chat_summaries" ON message_block_summaries;
DROP POLICY IF EXISTS "auth_read_own_guest_chat_summaries" ON message_block_summaries;
DROP POLICY IF EXISTS "Anonymous users read messages from guest chats" ON messages;
DROP POLICY IF EXISTS "Anonymous users insert messages to guest chats" ON messages;
DROP POLICY IF EXISTS "Anonymous users update messages in guest chats" ON messages;
DROP POLICY IF EXISTS "Authenticated users insert to own chats" ON messages;
DROP POLICY IF EXISTS "Authenticated users update own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users view own chat messages" ON messages;

-- Change chat_id column from UUID to TEXT to support guest prefixes
ALTER TABLE guest_reports ALTER COLUMN chat_id TYPE TEXT;

-- Recreate the policies with updated logic
CREATE POLICY "anon_read_guest_chat_audio" ON chat_audio_clips 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.chat_id::text = chat_audio_clips.chat_id::text
  )
);

CREATE POLICY "auth_read_own_guest_chat_audio" ON chat_audio_clips 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "anon_read_guest_chat_summaries" ON message_block_summaries 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.chat_id::text = message_block_summaries.chat_id::text
  )
);

CREATE POLICY "auth_read_own_guest_chat_summaries" ON message_block_summaries 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Anonymous users read messages from guest chats" ON messages 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.chat_id::text = messages.chat_id::text
  )
);

CREATE POLICY "Anonymous users insert messages to guest chats" ON messages 
FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.chat_id::text = messages.chat_id::text
  )
);

CREATE POLICY "Anonymous users update messages in guest chats" ON messages 
FOR UPDATE USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.chat_id::text = messages.chat_id::text
  )
) WITH CHECK (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.chat_id::text = messages.chat_id::text
  )
);

CREATE POLICY "Authenticated users insert to own chats" ON messages 
FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users update own messages" ON messages 
FOR UPDATE USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users view own chat messages" ON messages 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id::text
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);