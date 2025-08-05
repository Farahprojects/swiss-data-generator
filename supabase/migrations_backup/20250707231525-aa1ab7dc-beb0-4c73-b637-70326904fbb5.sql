-- Create trigger to update guest_reports with report_log_id when reports are completed
CREATE OR REPLACE FUNCTION public.update_guest_report_log_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update guest_reports with report_log_id if this is a guest report
  IF NEW.client_id IS NULL AND NEW.user_id IS NOT NULL THEN
    UPDATE public.guest_reports 
    SET report_log_id = NEW.id
    WHERE id::text = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for report_logs inserts
CREATE TRIGGER update_guest_report_log_reference_trigger
  AFTER INSERT ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_report_log_reference();