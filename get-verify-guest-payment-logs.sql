-- Get all logs from verify-guest-payment function
-- This will help us identify noisy logging and clean it up

-- Method 1: Check Supabase Edge Function logs (if available)
-- Note: This depends on your Supabase plan and logging setup
SELECT 
  timestamp,
  level,
  message,
  metadata
FROM supabase_logs 
WHERE function_name = 'verify-guest-payment'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Method 2: Check for any stored logs in database tables
-- Look for any logging tables that might store function logs
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name LIKE '%log%' 
  OR table_name LIKE '%debug%'
  OR table_name LIKE '%trace%'
ORDER BY table_name, ordinal_position;

-- Method 3: Check recent guest_reports for any logging data
SELECT 
  id,
  created_at,
  updated_at,
  has_report,
  has_swiss_error,
  payment_status,
  stripe_session_id
FROM guest_reports 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Method 4: Check translator_logs for recent guest activity
SELECT 
  id,
  user_id,
  is_guest,
  request_type,
  created_at,
  error_message,
  response_status
FROM translator_logs 
WHERE is_guest = true 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Method 5: Check report_logs for guest activity
SELECT 
  id,
  user_id,
  endpoint,
  report_type,
  status,
  error_message,
  created_at
FROM report_logs 
WHERE user_id IN (
  SELECT id FROM guest_reports WHERE created_at > NOW() - INTERVAL '24 hours'
)
ORDER BY created_at DESC
LIMIT 20; 