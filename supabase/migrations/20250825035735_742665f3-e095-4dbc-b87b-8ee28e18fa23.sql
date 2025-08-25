-- ✅ SECURITY FIX: Remove dangerous policy exposing all chat messages
DROP POLICY IF EXISTS "public_can_read_messages" ON public.messages;

-- ✅ SECURITY FIX: Create secure policies for chat messages
-- Users can only access messages from their own chat sessions

-- Allow authenticated users to view only their own chat messages
CREATE POLICY "Users can view own chat messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id FROM public.guest_reports 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to insert messages to their own chats
CREATE POLICY "Users can insert to own chats"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  chat_id IN (
    SELECT chat_id FROM public.guest_reports 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update their own messages
CREATE POLICY "Users can update own chat messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id FROM public.guest_reports 
    WHERE user_id = auth.uid()
  )
);

-- ✅ Ensure no public/anonymous access to private messages
REVOKE ALL ON public.messages FROM anon;
REVOKE ALL ON public.messages FROM public;