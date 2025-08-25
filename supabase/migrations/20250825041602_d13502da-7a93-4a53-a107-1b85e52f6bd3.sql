-- ✅ SECURITY FIX: Allow secure anonymous access to messages for guest chats
-- Anonymous users can only access messages for chats linked to guest reports
-- This enables guest users to chat with their reports without authentication

-- Allow anonymous users to read messages from guest report chats
CREATE POLICY "Anonymous users read messages from guest chats"
ON public.messages
FOR SELECT
TO anon
USING (
  chat_id IN (
    SELECT chat_id 
    FROM public.guest_reports 
    WHERE guest_reports.chat_id = messages.chat_id
  )
);

-- Allow anonymous users to insert messages to guest report chats  
CREATE POLICY "Anonymous users insert messages to guest chats"
ON public.messages
FOR INSERT
TO anon
WITH CHECK (
  chat_id IN (
    SELECT chat_id 
    FROM public.guest_reports 
    WHERE guest_reports.chat_id = messages.chat_id
  )
);

-- Allow anonymous users to update their own messages in guest chats
CREATE POLICY "Anonymous users update messages in guest chats" 
ON public.messages
FOR UPDATE
TO anon
USING (
  chat_id IN (
    SELECT chat_id 
    FROM public.guest_reports 
    WHERE guest_reports.chat_id = messages.chat_id
  )
)
WITH CHECK (
  chat_id IN (
    SELECT chat_id 
    FROM public.guest_reports 
    WHERE guest_reports.chat_id = messages.chat_id
  )
);

-- Grant necessary permissions to anon role for messages
GRANT SELECT, INSERT, UPDATE ON public.messages TO anon;