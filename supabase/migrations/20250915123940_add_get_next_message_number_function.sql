-- Use a database function with proper locking
CREATE OR REPLACE FUNCTION get_next_message_number(p_chat_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Lock the chat to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext(p_chat_id::text));
    
    -- Get and increment in one atomic operation
    SELECT COALESCE(MAX(message_number), 0) + 1 
    INTO next_num
    FROM messages 
    WHERE chat_id = p_chat_id;
    
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;
