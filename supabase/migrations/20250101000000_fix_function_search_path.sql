-- Fix functions missing SET search_path for security compliance
-- This addresses the SUPA_function_search_path_mutable linting warning

-- 1. Fix check_and_trigger_summary function
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
$$ LANGUAGE plpgsql SET search_path = 'public';

-- 2. Fix get_next_message_number function
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
$$ LANGUAGE plpgsql SET search_path = 'public';

-- 3. Fix touch_updated_at function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 4. Fix update_temp_audio_updated_at function
CREATE OR REPLACE FUNCTION update_temp_audio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = 'public';

-- 5. Fix cleanup_old_temp_audio function
CREATE OR REPLACE FUNCTION cleanup_old_temp_audio()
RETURNS void AS $$
BEGIN
    DELETE FROM public.temp_audio 
    WHERE updated_at < now() - interval '24 hours';
END;
$$ language 'plpgsql' SET search_path = 'public';
