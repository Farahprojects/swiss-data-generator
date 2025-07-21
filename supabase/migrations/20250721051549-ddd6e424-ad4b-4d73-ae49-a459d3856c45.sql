
-- Update the trigger_notify_orchestrator function with the new logic
CREATE OR REPLACE FUNCTION public.trigger_notify_orchestrator()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Swiss-only report: trigger if swiss_boolean = TRUE AND is_ai_report = FALSE
  IF NEW.swiss_boolean = TRUE AND NEW.is_ai_report = FALSE THEN
    PERFORM rpc_notify_orchestrator(NEW.id);
    UPDATE guest_reports SET rcp_at = now() WHERE id = NEW.id;

  -- AI report: trigger if has_report_log = TRUE
  ELSIF NEW.has_report_log = TRUE THEN
    PERFORM rpc_notify_orchestrator(NEW.id);
    UPDATE guest_reports SET rcp_at = now() WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger on guest_reports table
CREATE TRIGGER trg_notify_orchestrator_on_guest_reports
  AFTER UPDATE ON public.guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_orchestrator();
