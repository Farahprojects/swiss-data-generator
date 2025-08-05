-- Fix translator_logs to guest_reports linking
-- This trigger automatically sets guest_reports.translator_log_id when a translator_logs row is inserted
-- with user_id matching a guest_reports.id

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_translator_logs_link_guest_report ON translator_logs;
DROP FUNCTION IF EXISTS link_translator_log_to_guest_report();

-- Create function to link translator_logs to guest_reports
CREATE OR REPLACE FUNCTION link_translator_log_to_guest_report()
RETURNS TRIGGER AS $$
DECLARE
  guest_report_exists boolean;
  rows_updated integer;
BEGIN
  -- Only proceed if this is a guest log (is_guest = true) and user_id is not null
  IF NEW.is_guest = true AND NEW.user_id IS NOT NULL THEN
    
    -- Check if guest_report exists
    SELECT EXISTS(SELECT 1 FROM guest_reports WHERE id = NEW.user_id) INTO guest_report_exists;
    
    -- Update guest_reports.translator_log_id where id matches user_id
    UPDATE guest_reports 
    SET translator_log_id = NEW.id
    WHERE id = NEW.user_id;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Log the linking attempt for debugging
    RAISE NOTICE 'Linking translator_log % to guest_report % (user_id: %). Guest report exists: %, Rows updated: %', 
      NEW.id, NEW.user_id, NEW.user_id, guest_report_exists, rows_updated;
      
  ELSE
    -- Log when trigger doesn't fire
    RAISE NOTICE 'Trigger skipped: is_guest = %, user_id = %', 
      NEW.is_guest, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on translator_logs inserts
CREATE TRIGGER trg_translator_logs_link_guest_report
  AFTER INSERT ON translator_logs
  FOR EACH ROW
  EXECUTE FUNCTION link_translator_log_to_guest_report();

-- Add index to improve performance of the linking query
CREATE INDEX IF NOT EXISTS idx_guest_reports_id_for_linking ON guest_reports(id);
CREATE INDEX IF NOT EXISTS idx_translator_logs_user_id_guest ON translator_logs(user_id) WHERE is_guest = true; 