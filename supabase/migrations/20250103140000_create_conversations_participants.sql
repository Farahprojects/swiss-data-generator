-- Create conversations_participants table for multi-user conversations
-- This replaces the need for duplicate conversation rows per user

-- 1. Create conversations_participants table
CREATE TABLE conversations_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  
  PRIMARY KEY (conversation_id, user_id)
);

-- 2. Create indexes for performance
CREATE INDEX idx_conversations_participants_user_id ON conversations_participants(user_id);
CREATE INDEX idx_conversations_participants_conversation_id ON conversations_participants(conversation_id);

-- 3. Enable RLS
ALTER TABLE conversations_participants ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for conversations_participants
-- Policy: Users can view participants (non-recursive)
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversations_participants;
CREATE POLICY "Users can view participants"
ON conversations_participants
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can join conversations (insert their own row)
CREATE POLICY "Users can join conversations"
ON conversations_participants
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can leave conversations (delete their own row)
CREATE POLICY "Users can leave conversations"
ON conversations_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Policy: Owners can manage participants (update/delete any row in their conversations)
CREATE POLICY "Owners can manage participants"
ON conversations_participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversations_participants owner_check
    WHERE owner_check.conversation_id = conversations_participants.conversation_id
      AND owner_check.user_id = auth.uid()
      AND owner_check.role = 'owner'
  )
);

-- 5. Add owner_user_id column to conversations table
ALTER TABLE conversations ADD COLUMN owner_user_id uuid REFERENCES auth.users(id);

-- 6. Backfill owner_user_id from existing user_id
UPDATE conversations 
SET owner_user_id = user_id 
WHERE owner_user_id IS NULL;

-- 7. Seed owner participants for existing conversations
INSERT INTO conversations_participants (conversation_id, user_id, role, joined_at)
SELECT 
  id as conversation_id,
  user_id,
  'owner' as role,
  created_at as joined_at
FROM conversations
WHERE NOT EXISTS (
  SELECT 1
  FROM conversations_participants p
  WHERE p.conversation_id = conversations.id
    AND p.user_id = conversations.user_id
);

-- 8. Update conversations RLS policies to use conversations_participants
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- New policies using conversations_participants

-- View: participants or public
CREATE POLICY "Conversations public view"
ON conversations
FOR SELECT
TO public
USING (is_public = true);

CREATE POLICY "Conversations participant view"
ON conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversations_participants p
    WHERE p.conversation_id = conversations.id
      AND p.user_id = auth.uid()
  )
);

-- Create: only the owner (on creation) - allows inserting conversations
CREATE POLICY "Conversations owner create"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

-- Update/Delete: only owner
CREATE POLICY "Conversations owner write"
ON conversations
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Conversations owner delete"
ON conversations
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- 9. Update messages RLS policies to use conversations_participants
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON messages;

-- New policies using conversations_participants

-- View for participants
CREATE POLICY "Participants can view messages"
ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversations_participants p
    WHERE p.conversation_id = messages.chat_id
      AND p.user_id = auth.uid()
  )
);

-- Insert: allow participants to post messages
CREATE POLICY "Participants can insert messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM conversations_participants p
    WHERE p.conversation_id = messages.chat_id
      AND p.user_id = auth.uid()
  )
);

-- Note: Public view policy for messages already exists and should remain
