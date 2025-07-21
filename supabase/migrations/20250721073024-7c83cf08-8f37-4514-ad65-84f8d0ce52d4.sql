
-- Drop the existing disabled trigger if it exists
DROP TRIGGER IF EXISTS trg_update_guest_reports_report_log ON public.report_logs;

-- Create a simple, lean function to update guest_reports with report_log_id
CREATE OR REPLACE FUNCTION public.update_guest_report_with_log_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Simple update: match guest_reports.id::text with report_logs.user_id
  UPDATE public.guest_reports 
  SET report_log_id = NEW.id
  WHERE id::text = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger to fire after insert on report_logs
CREATE TRIGGER trg_update_guest_reports_report_log
  AFTER INSERT ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_report_with_log_id();
