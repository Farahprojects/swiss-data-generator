-- Debug queries to trace translator_logs to guest_reports linking issue

-- 1. Check recent translator_logs entries and their user_id values
SELECT 
  id,
  user_id,
  user_id_type = pg_typeof(user_id) as user_id_type,
  is_guest,
  request_type,
  created_at,
  CASE 
    WHEN user_id IS NULL THEN 'NULL'
    WHEN user_id = '' THEN 'EMPTY_STRING'
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'VALID_UUID'
    ELSE 'INVALID_FORMAT'
  END as user_id_status
FROM translator_logs 
WHERE is_guest = true 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check guest_reports that should have translator_log_id but don't
SELECT 
  gr.id,
  gr.translator_log_id,
  gr.created_at,
  gr.has_report,
  gr.has_swiss_error
FROM guest_reports gr
WHERE gr.translator_log_id IS NULL 
  AND gr.has_report = true
  AND gr.created_at > NOW() - INTERVAL '24 hours'
ORDER BY gr.created_at DESC;

-- 3. Find orphaned translator_logs (no matching guest_report)
SELECT 
  tl.id,
  tl.user_id,
  tl.is_guest,
  tl.created_at,
  gr.id as guest_report_id
FROM translator_logs tl
LEFT JOIN guest_reports gr ON gr.id = tl.user_id
WHERE tl.is_guest = true 
  AND gr.id IS NULL
  AND tl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY tl.created_at DESC;

-- 4. Check for potential linking issues
SELECT 
  gr.id as guest_report_id,
  gr.translator_log_id,
  tl.id as translator_log_id,
  tl.user_id as translator_user_id,
  gr.created_at as guest_created,
  tl.created_at as translator_created,
  EXTRACT(EPOCH FROM (tl.created_at - gr.created_at)) as time_diff_seconds
FROM guest_reports gr
LEFT JOIN translator_logs tl ON tl.user_id = gr.id AND tl.is_guest = true
WHERE gr.created_at > NOW() - INTERVAL '24 hours'
  AND (gr.translator_log_id IS NULL OR gr.translator_log_id != tl.id)
ORDER BY gr.created_at DESC;

-- 5. Check specific UUID that's causing issues
SELECT 
  'translator_logs' as table_name,
  id,
  user_id,
  is_guest,
  created_at,
  request_type
FROM translator_logs 
WHERE user_id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
ORDER BY created_at DESC;

SELECT 
  'guest_reports' as table_name,
  id,
  translator_log_id,
  has_report,
  created_at
FROM guest_reports 
WHERE id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
ORDER BY created_at DESC;

-- 6. Check if this UUID exists in api_keys (regular user)
SELECT 
  'api_keys' as table_name,
  id,
  user_id,
  email,
  is_active
FROM api_keys 
WHERE user_id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
ORDER BY created_at DESC;

-- 7. Manual fix for orphaned translator_logs (run this if needed)
-- UPDATE guest_reports 
-- SET translator_log_id = (
--   SELECT tl.id 
--   FROM translator_logs tl 
--   WHERE tl.user_id = guest_reports.id 
--     AND tl.is_guest = true
--     AND tl.created_at > guest_reports.created_at - INTERVAL '5 minutes'
--   ORDER BY tl.created_at ASC 
--   LIMIT 1
-- )
-- WHERE translator_log_id IS NULL 
--   AND has_report = true; 