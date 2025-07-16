-- Check recent translator_logs entries and their corresponding guest_reports
SELECT 
  tl.id as translator_log_id,
  tl.user_id,
  tl.is_guest,
  tl.created_at as tl_created_at,
  gr.id as guest_report_id,
  gr.translator_log_id,
  gr.has_report,
  gr.created_at as gr_created_at,
  CASE 
    WHEN gr.translator_log_id IS NULL THEN 'NOT_LINKED'
    WHEN gr.translator_log_id = tl.id THEN 'LINKED'
    ELSE 'WRONG_LINK'
  END as link_status
FROM translator_logs tl
LEFT JOIN guest_reports gr ON tl.user_id = gr.id
WHERE tl.is_guest = true 
  AND tl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY tl.created_at DESC
LIMIT 10; 