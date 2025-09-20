-- Add RLS policies for messages table to allow authenticated users to access their own messages
-- This fixes the issue where fetchMessages was returning 0 messages due to missing RLS policies

-- Add policy to allow authenticated users to read their own messages
CREATE POLICY "users_can_read_own_messages" ON messages
FOR SELECT 
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM conversations 
    WHERE user_id = auth.uid()
  )
);

-- Add policy to allow authenticated users to insert messages
CREATE POLICY "users_can_insert_messages" ON messages
FOR INSERT 
TO authenticated
WITH CHECK (
  chat_id IN (
    SELECT id FROM conversations 
    WHERE user_id = auth.uid()
  )
);

-- Add policy to allow authenticated users to update their own messages
CREATE POLICY "users_can_update_own_messages" ON messages
FOR UPDATE 
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM conversations 
    WHERE user_id = auth.uid()
  )
);
