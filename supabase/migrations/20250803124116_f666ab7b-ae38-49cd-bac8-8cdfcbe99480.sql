-- Drop and recreate the trigger to ensure it's working correctly
DROP TRIGGER IF EXISTS after_insert_report_log ON public.report_logs;

-- Create trigger on report_logs to link back to guest_reports
CREATE TRIGGER after_insert_report_log
  AFTER INSERT ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.link_report_log_to_guest();