-- Add mode column to messages table
-- This will store the chat mode (chat, astro, etc.) for each message

-- First, drop any existing indexes on the messages table to avoid conflicts
DROP INDEX IF EXISTS idx_messages_chat_id_created_at;
DROP INDEX IF EXISTS idx_messages_chat_id_message_number;
DROP INDEX IF EXISTS idx_messages_chat_id_role;
DROP INDEX IF EXISTS idx_messages_status;

-- Add the mode column to messages table
ALTER TABLE public.messages 
ADD COLUMN mode TEXT DEFAULT 'chat' 
CHECK (mode IN ('chat', 'astro'));

-- Add comment to document the column
COMMENT ON COLUMN public.messages.mode IS 'Chat mode when this message was sent (chat, astro, etc.)';

-- Recreate essential indexes with the new column
-- Primary index for chat queries (most important)
CREATE INDEX idx_messages_chat_id_message_number 
ON public.messages (chat_id, message_number);

-- Index for role-based queries
CREATE INDEX idx_messages_chat_id_role 
ON public.messages (chat_id, role);

-- Index for status queries
CREATE INDEX idx_messages_status 
ON public.messages (status);

-- Index for mode queries (new)
CREATE INDEX idx_messages_mode 
ON public.messages (mode);

-- Composite index for chat + mode queries (useful for filtering)
CREATE INDEX idx_messages_chat_id_mode 
ON public.messages (chat_id, mode);

-- Index for chronological queries
CREATE INDEX idx_messages_chat_id_created_at 
ON public.messages (chat_id, created_at);

-- Update existing messages to have 'chat' mode (since they were all chat messages)
UPDATE public.messages 
SET mode = 'chat' 
WHERE mode IS NULL OR mode = 'chat';
