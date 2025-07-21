-- Manual fix for the test case that should have been updated
UPDATE public.guest_reports 
SET 
  report_log_id = 'e44596f8-86e6-44e9-a95a-e6867e50d88c',
  has_report_log = true,
  updated_at = now()
WHERE id = 'ed7c10e9-844c-4b46-acdc-6f85989ce382';