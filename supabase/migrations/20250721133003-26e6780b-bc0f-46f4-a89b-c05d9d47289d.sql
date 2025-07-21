-- Drop the rcp_at column from guest_reports table
ALTER TABLE public.guest_reports DROP COLUMN IF EXISTS rcp_at;

-- Update the trigger function to remove the rcp_at update that causes infinite loops
CREATE OR REPLACE FUNCTION public.trigger_notify_orchestrator()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Swiss-only report: trigger if swiss_boolean = TRUE AND is_ai_report = FALSE
  IF NEW.swiss_boolean = TRUE AND NEW.is_ai_report = FALSE THEN
    PERFORM rpc_notify_orchestrator(NEW.id);

  -- AI report: trigger if has_report_log = TRUE
  ELSIF NEW.has_report_log = TRUE THEN
    PERFORM rpc_notify_orchestrator(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;