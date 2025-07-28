-- Fix the trigger logic to properly detect AI reports
CREATE OR REPLACE FUNCTION public.trigger_notify_orchestrator()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Swiss-only report: trigger if swiss_boolean = TRUE AND is_ai_report = FALSE
  IF NEW.swiss_boolean = TRUE AND NEW.is_ai_report = FALSE THEN
    PERFORM rpc_notify_orchestrator(NEW.id);

  -- AI report: trigger if is_ai_report = TRUE
  ELSIF NEW.is_ai_report = TRUE THEN
    PERFORM rpc_notify_orchestrator(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;