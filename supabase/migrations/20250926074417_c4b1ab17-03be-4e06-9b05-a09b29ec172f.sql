-- Phase 1: Database-Level Guarantees for Message Ordering (Handle Duplicates)

-- Step 1: Fix duplicate message numbers by reassigning them sequentially
WITH ranked_messages AS (
  SELECT id, chat_id, message_number,
         ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at) as new_number
  FROM messages 
)
UPDATE messages 
SET message_number = rm.new_number
FROM ranked_messages rm
WHERE messages.id = rm.id;

-- Step 2: Make message_number NOT NULL with a proper default
ALTER TABLE messages 
ALTER COLUMN message_number SET NOT NULL,
ALTER COLUMN message_number SET DEFAULT 1;

-- Step 3: Create a trigger to automatically assign message_number
CREATE OR REPLACE FUNCTION assign_message_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign if not already set
  IF NEW.message_number IS NULL THEN
    NEW.message_number := get_next_message_number(NEW.chat_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
DROP TRIGGER IF EXISTS trigger_assign_message_number ON messages;
CREATE TRIGGER trigger_assign_message_number
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION assign_message_number();

-- Step 5: Create composite index for fast ordered queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_message_number 
ON messages (chat_id, message_number);

-- Step 6: Create unique constraint to prevent duplicate message numbers per chat
ALTER TABLE messages 
ADD CONSTRAINT unique_chat_message_number 
UNIQUE (chat_id, message_number);