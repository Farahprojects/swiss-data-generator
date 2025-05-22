
-- Create an RPC function to log events to admin_logs table if it doesn't exist
CREATE OR REPLACE FUNCTION log_admin_event(
  _page TEXT,
  _event_type TEXT,
  _logs TEXT,
  _user_id UUID DEFAULT NULL,
  _meta JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO admin_logs (page, event_type, logs, user_id, meta)
  VALUES (_page, _event_type, _logs, _user_id, _meta)
  RETURNING id INTO _id;
  
  RETURN _id;
END;
$$;
