-- Check if the specific guest report UUID exists in translator_logs
SELECT 
  id,
  user_id,
  is_guest,
  request_type,
  created_at,
  error_message
FROM translator_logs 
WHERE user_id = 'b1112567-d603-4b0e-9b97-ccaaf8d26e10'
ORDER BY created_at DESC;

-- If no results, this means the translator function was never called for this guest report
-- OR the insert failed 