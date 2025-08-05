-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trg_guest_reports_update ON guest_reports;
DROP FUNCTION IF EXISTS insert_temp_report_data();

-- Function 1: Handle Swiss data (creates new temp row)
CREATE OR REPLACE FUNCTION insert_temp_report_data_swiss()
RETURNS TRIGGER AS $$
DECLARE
  swiss jsonb;
  short_hash text;
  token_text text;
  token_hash text;
BEGIN
  -- Only proceed if translator_log_id was just populated
  IF OLD.translator_log_id IS NULL AND NEW.translator_log_id IS NOT NULL THEN
    
    -- Get swiss_data from translator_logs
    SELECT swiss_data
    INTO swiss
    FROM translator_logs
    WHERE id = NEW.translator_log_id;

    -- Generate short hash for chat_hash
    short_hash := substring(md5(gen_random_uuid()::text), 1, 10);
    
    -- Generate a secure token and hash it
    token_text := encode(gen_random_bytes(32), 'hex');
    token_hash := encode(sha256(token_text::bytea), 'hex');

    -- Insert into temp_report_data with a new UUID
    INSERT INTO temp_report_data (
      id,
      report_content,
      swiss_data,
      metadata,
      created_at,
      expires_at,
      chat_hash,
      token_hash
    ) VALUES (
      gen_random_uuid(),
      NULL, -- No report content yet
      swiss,
      jsonb_build_object(
        'report_type', NEW.report_type,
        'customer_email', NEW.email,
        'has_report', NEW.has_report,
        'guest_report_id', NEW.id,
        'coach_name', NEW.coach_name,
        'coach_slug', NEW.coach_slug
      ),
      now(),
      now() + interval '72 hours',
      short_hash,
      token_hash
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Handle Report data (updates existing temp row)
CREATE OR REPLACE FUNCTION update_temp_report_data_report()
RETURNS TRIGGER AS $$
DECLARE
  ai_text text;
BEGIN
  -- Only proceed if report_log_id was just populated
  IF OLD.report_log_id IS NULL AND NEW.report_log_id IS NOT NULL THEN
    
    -- Get report_text from report_logs
    SELECT report_text
    INTO ai_text
    FROM report_logs
    WHERE id = NEW.report_log_id;

    -- Update the existing temp_report_data row
    UPDATE temp_report_data
    SET 
      report_content = ai_text,
      metadata = metadata || jsonb_build_object('has_report', true)
    WHERE metadata->>'guest_report_id' = NEW.id::text;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trg_guest_reports_swiss
  AFTER UPDATE ON guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION insert_temp_report_data_swiss();

CREATE TRIGGER trg_guest_reports_report
  AFTER UPDATE ON guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_temp_report_data_report();