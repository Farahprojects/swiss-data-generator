-- Manual fix for orphaned guest reports
-- This will link guest_reports to translator_logs for existing records that weren't linked by the trigger

-- 1. First, let's see what orphaned guest reports we have
SELECT 
  gr.id,
  gr.created_at,
  gr.has_report,
  gr.has_swiss_error,
  COUNT(tl.id) as translator_logs_count
FROM guest_reports gr
LEFT JOIN translator_logs tl ON gr.id = tl.user_id AND tl.is_guest = true
WHERE gr.translator_log_id IS NULL 
  AND gr.has_report = true
GROUP BY gr.id, gr.created_at, gr.has_report, gr.has_swiss_error
ORDER BY gr.created_at DESC;

-- 2. Update orphaned guest reports to link to their translator_logs
UPDATE guest_reports 
SET translator_log_id = (
  SELECT tl.id 
  FROM translator_logs tl 
  WHERE tl.user_id = guest_reports.id 
    AND tl.is_guest = true
    AND tl.created_at > guest_reports.created_at - INTERVAL '5 minutes'
    AND tl.created_at < guest_reports.created_at + INTERVAL '5 minutes'
  ORDER BY tl.created_at ASC 
  LIMIT 1
)
WHERE translator_log_id IS NULL 
  AND has_report = true
  AND EXISTS (
    SELECT 1 
    FROM translator_logs tl 
    WHERE tl.user_id = guest_reports.id 
      AND tl.is_guest = true
      AND tl.created_at > guest_reports.created_at - INTERVAL '5 minutes'
      AND tl.created_at < guest_reports.created_at + INTERVAL '5 minutes'
  );

-- 3. Verify the fix worked
SELECT 
  gr.id,
  gr.translator_log_id,
  gr.has_report,
  gr.created_at,
  tl.id as translator_log_id_verify,
  tl.user_id,
  tl.is_guest,
  tl.created_at as tl_created_at
FROM guest_reports gr
LEFT JOIN translator_logs tl ON gr.translator_log_id = tl.id
WHERE gr.has_report = true
  AND gr.created_at > NOW() - INTERVAL '24 hours'
ORDER BY gr.created_at DESC; 