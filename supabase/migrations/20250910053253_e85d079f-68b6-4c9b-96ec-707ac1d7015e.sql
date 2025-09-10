-- Recreate essential RLS policies for guest chat functionality
-- Messages table policies for guest reports
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

-- Authenticated user policies for their own guest chats
CREATE POLICY "Authenticated users view own chat messages" ON messages 
FOR SELECT USING (
  chat_id IN (
    SELECT gr.chat_id
    FROM guest_reports gr
    WHERE gr.user_id = auth.uid()
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

-- Audio clips policies
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

-- Message summaries policies
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