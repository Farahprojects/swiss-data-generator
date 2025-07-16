-- Debug specific guest report: b1112567-d603-4b0e-9b97-ccaaf8d26e10

-- 1. Check if there are any translator_logs entries around the same time
SELECT 
  id,
  user_id,
  is_guest,
  request_type,
  created_at,
  error_message
FROM translator_logs 
WHERE created_at BETWEEN '2025-07-16 08:30:00' AND '2025-07-16 09:00:00'
ORDER BY created_at DESC;

-- 2. Check if there are any errors in the guest report
SELECT 
  id,
  has_report,
  has_swiss_error,
  swiss_boolean,
  payment_status,
  created_at,
  updated_at
FROM guest_reports 
WHERE id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10';

-- 3. Check if there are any report_logs entries for this guest report
SELECT 
  id,
  user_id,
  has_error,
  error_message,
  created_at
FROM report_logs 
WHERE user_id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
ORDER BY created_at DESC;

-- 4. Check if there are any user_errors for this guest report
SELECT 
  id,
  error_type,
  error_message,
  guest_report_id,
  created_at
FROM user_errors 
WHERE guest_report_id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
ORDER BY created_at DESC;

-- 5. Manual fix: Find any translator_logs that should be linked to this guest report
-- (This would be for cases where the trigger didn't work)
SELECT 
  tl.id as translator_log_id,
  tl.user_id,
  tl.is_guest,
  tl.created_at,
  gr.id as guest_report_id,
  gr.created_at as guest_report_created_at
FROM translator_logs tl
JOIN guest_reports gr ON tl.user_id = gr.id
WHERE gr.id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
  AND gr.translator_log_id IS NULL
  AND tl.is_guest = true; 