-- Add message_number column to messages table for sequential numbering per chat
ALTER TABLE messages
ADD COLUMN message_number INT;

-- Create index for efficient querying by chat_id and message_number
CREATE INDEX IF NOT EXISTS idx_messages_chat_message_number 
ON messages (chat_id, message_number);

-- Add comment to document the column purpose
COMMENT ON COLUMN messages.message_number IS 'Sequential message number within each chat, starting from 1';
