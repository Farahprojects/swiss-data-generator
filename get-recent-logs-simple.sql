-- Simple query to get recent logs from database tables
-- Run these one by one to see what logging data we have

-- 1. Recent translator_logs (guest reports only)
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
  AND created_at > NOW() - INTERVAL '6 hours'
ORDER BY created_at DESC;

-- 2. Recent report_logs for guest reports
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
  SELECT id FROM guest_reports WHERE created_at > NOW() - INTERVAL '6 hours'
)
ORDER BY created_at DESC;

-- 3. Recent guest_reports with status
SELECT 
  id,
  created_at,
  has_report,
  has_swiss_error,
  payment_status,
  translator_log_id
FROM guest_reports 
WHERE created_at > NOW() - INTERVAL '6 hours'
ORDER BY created_at DESC;

-- 4. Check if there are any other logging tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%log%' OR table_name LIKE '%debug%' OR table_name LIKE '%trace%')
ORDER BY table_name; 