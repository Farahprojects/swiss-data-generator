-- Function to set has_report flag when report_log_id is populated
CREATE OR REPLACE FUNCTION set_has_report_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.report_log_id IS NULL AND NEW.report_log_id IS NOT NULL THEN
    NEW.has_report = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set has_report when report_log_id gets added
CREATE TRIGGER update_has_report_on_report_log_id
  BEFORE UPDATE ON guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_has_report_flag();