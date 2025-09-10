-- Drop ALL policies that depend on guest_reports.chat_id
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
DROP POLICY IF EXISTS "Authenticated users update own report signals" ON report_ready_signals;
DROP POLICY IF EXISTS "Authenticated users view own report signals" ON report_ready_signals;

-- Change chat_id column from UUID to TEXT to support guest prefixes
ALTER TABLE guest_reports ALTER COLUMN chat_id TYPE TEXT;

-- Also change chat_id columns in related tables to TEXT for consistency
ALTER TABLE chat_audio_clips ALTER COLUMN chat_id TYPE TEXT;
ALTER TABLE message_block_summaries ALTER COLUMN chat_id TYPE TEXT;
ALTER TABLE messages ALTER COLUMN chat_id TYPE TEXT;
ALTER TABLE report_ready_signals ALTER COLUMN chat_id TYPE TEXT;

-- Recreate all policies with updated logic
CREATE POLICY "anon_read_guest_chat_audio" ON chat_audio_clips 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.chat_id = chat_audio_clips.chat_id
  )
);

CREATE POLICY "auth_read_own_guest_chat_audio" ON chat_audio_clips 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "anon_read_guest_chat_summaries" ON message_block_summaries 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.chat_id = message_block_summaries.chat_id
  )
);

CREATE POLICY "auth_read_own_guest_chat_summaries" ON message_block_summaries 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Anonymous users read messages from guest chats" ON messages 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.chat_id = messages.chat_id
  )
);

CREATE POLICY "Anonymous users insert messages to guest chats" ON messages 
FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.chat_id = messages.chat_id
  )
);

CREATE POLICY "Anonymous users update messages in guest chats" ON messages 
FOR UPDATE USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.chat_id = messages.chat_id
  )
) WITH CHECK (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.chat_id = messages.chat_id
  )
);

CREATE POLICY "Authenticated users insert to own chats" ON messages 
FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users update own messages" ON messages 
FOR UPDATE USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users view own chat messages" ON messages 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users update own report signals" ON report_ready_signals 
FOR UPDATE USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users view own report signals" ON report_ready_signals 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
  )
);