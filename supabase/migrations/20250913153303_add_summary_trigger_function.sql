-- Create function to check and trigger summary generation after message inserts
CREATE OR REPLACE FUNCTION check_and_trigger_summary()
RETURNS TRIGGER AS $$
DECLARE
  message_count INTEGER;
  latest_summary_end_time TIMESTAMPTZ;
BEGIN
  -- Only process for user/assistant messages, skip system messages
  IF NEW.role NOT IN ('user', 'assistant') THEN
    RETURN NEW;
  END IF;

  -- Get the timestamp of the last summarized message for this chat
  SELECT m.created_at INTO latest_summary_end_time
  FROM messages m
  JOIN message_block_summaries mbs ON m.id = mbs.end_message_id
  WHERE mbs.chat_id = NEW.chat_id
  ORDER BY mbs.block_index DESC
  LIMIT 1;

  -- Count messages since last summary (or all messages if no summary exists)
  IF latest_summary_end_time IS NOT NULL THEN
    SELECT COUNT(*) INTO message_count
    FROM messages
    WHERE chat_id = NEW.chat_id
      AND created_at > latest_summary_end_time
      AND role IN ('user', 'assistant');
  ELSE
    SELECT COUNT(*) INTO message_count
    FROM messages
    WHERE chat_id = NEW.chat_id
      AND role IN ('user', 'assistant');
  END IF;

  -- If we have 12 or more messages (6 pairs), trigger summary generation
  IF message_count >= 12 THEN
    -- Call the edge function asynchronously (fire and forget)
    PERFORM net.http_post(
      url := 'https://api.therai.co/functions/v1/generate-summary',
      body := jsonb_build_object(
        'chat_id', NEW.chat_id,
        'trigger_check', true
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically check for summary generation on new messages
DROP TRIGGER IF EXISTS trigger_summary_check ON messages;
CREATE TRIGGER trigger_summary_check
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_and_trigger_summary();
