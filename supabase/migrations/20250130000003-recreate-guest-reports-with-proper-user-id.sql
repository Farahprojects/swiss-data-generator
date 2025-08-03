-- Phase 1: Drop and Recreate guest_reports with proper user_id
-- This fixes the UUID identity chaos and provides real auth context

-- 1. Drop existing triggers and dependencies first
DROP TRIGGER IF EXISTS trg_log_modal_ready ON guest_reports;
DROP TRIGGER IF EXISTS update_guest_reports_updated_at ON guest_reports;
DROP TRIGGER IF EXISTS trg_translator_logs_link_guest_report ON translator_logs;

DROP FUNCTION IF EXISTS log_modal_ready_change();
DROP FUNCTION IF EXISTS update_guest_reports_updated_at();
DROP FUNCTION IF EXISTS link_translator_log_to_guest_report();

-- 2. Drop existing policies
DROP POLICY IF EXISTS realtime_ping ON guest_reports;
DROP POLICY IF EXISTS "Users can access own reports" ON guest_reports;

-- 3. Drop the current guest_reports table
DROP TABLE IF EXISTS guest_reports CASCADE;

-- 4. Create new guest_reports with proper user_id
CREATE TABLE guest_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  email TEXT NOT NULL,
  report_type TEXT,
  amount_paid NUMERIC NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  email_sent BOOLEAN NOT NULL DEFAULT false,
  modal_ready BOOLEAN NOT NULL DEFAULT false,
  report_log_id UUID REFERENCES report_logs(id),
  translator_log_id UUID REFERENCES translator_logs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create indexes for performance
CREATE INDEX idx_guest_reports_user_id ON guest_reports(user_id);
CREATE INDEX idx_guest_reports_stripe_session_id ON guest_reports(stripe_session_id);
CREATE INDEX idx_guest_reports_email ON guest_reports(email);
CREATE INDEX idx_guest_reports_modal_ready ON guest_reports(modal_ready);

-- 6. Enable RLS
ALTER TABLE guest_reports ENABLE ROW LEVEL SECURITY;

-- 7. Create simple RLS policy
CREATE POLICY "Users can access own reports" 
ON guest_reports FOR ALL 
USING (user_id = auth.uid());

-- 8. Enable realtime
ALTER TABLE guest_reports REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE guest_reports;

-- 9. Create debug logging trigger for modal_ready changes
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
      'user_id', NEW.user_id,
      'old_modal_ready', OLD.modal_ready,
      'new_modal_ready', NEW.modal_ready,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log modal_ready changes
CREATE TRIGGER trg_log_modal_ready
  AFTER UPDATE ON guest_reports
  FOR EACH ROW
  WHEN (OLD.modal_ready IS DISTINCT FROM NEW.modal_ready)
  EXECUTE FUNCTION log_modal_ready_change(); 