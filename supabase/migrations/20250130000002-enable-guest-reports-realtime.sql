-- Enable realtime for guest_reports table
-- This ensures UPDATE events are broadcast when modal_ready changes

-- 1. Set REPLICA IDENTITY FULL to ensure all column changes are captured
ALTER TABLE guest_reports REPLICA IDENTITY FULL;

-- 2. Add guest_reports to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE guest_reports;

-- 3. Create minimal RLS policy for realtime notifications
-- This allows the realtime system to check if the event should be visible
-- without exposing sensitive data
CREATE OR REPLACE POLICY realtime_ping
ON guest_reports
FOR SELECT
USING ( 
  id = current_setting('realtime.subscription_parameters'::text)::uuid 
);

-- 4. Enable RLS on guest_reports if not already enabled
ALTER TABLE guest_reports ENABLE ROW LEVEL SECURITY;

-- 5. Add debug logging to the trigger that sets modal_ready
-- This will help us track when the trigger fires
CREATE OR REPLACE FUNCTION log_modal_ready_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the modal_ready change for debugging
  INSERT INTO debug_logs(source, message, details)
  VALUES (
    'trg_notify', 
    'set modal_ready', 
    jsonb_build_object(
      'guest_report_id', NEW.id,
      'old_modal_ready', OLD.modal_ready,
      'new_modal_ready', NEW.modal_ready,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log modal_ready changes
DROP TRIGGER IF EXISTS trg_log_modal_ready ON guest_reports;
CREATE TRIGGER trg_log_modal_ready
  AFTER UPDATE ON guest_reports
  FOR EACH ROW
  WHEN (OLD.modal_ready IS DISTINCT FROM NEW.modal_ready)
  EXECUTE FUNCTION log_modal_ready_change(); 