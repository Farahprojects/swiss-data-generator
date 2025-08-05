-- Ensure has_report is set when translator_log_id or report_log_id are populated
CREATE OR REPLACE FUNCTION update_guest_report_has_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Set has_report = true when either translator_log_id or report_log_id becomes non-null
  IF (OLD.translator_log_id IS NULL AND NEW.translator_log_id IS NOT NULL) OR
     (OLD.report_log_id IS NULL AND NEW.report_log_id IS NOT NULL) THEN
    NEW.has_report = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_guest_report_has_report ON guest_reports;
CREATE TRIGGER trigger_update_guest_report_has_report
  BEFORE UPDATE ON guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_report_has_report();