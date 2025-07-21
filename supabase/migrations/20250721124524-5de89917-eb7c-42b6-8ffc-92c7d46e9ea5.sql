
-- First, ensure the trigger function exists and is up to date
CREATE OR REPLACE FUNCTION public.update_guest_report_with_log_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update guest_reports with report_log_id and set has_report_log = true
  UPDATE public.guest_reports 
  SET 
    report_log_id = NEW.id,
    has_report_log = true,
    updated_at = now()
  WHERE id::text = NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the insert
    INSERT INTO debug_logs (source, message, details)
    VALUES (
      'update_guest_report_with_log_id',
      'Failed to update guest_reports with report_log_id',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'report_log_id', NEW.id,
        'error', SQLERRM
      )
    );
    RETURN NEW;
END;
$function$;

-- Create the missing trigger
CREATE TRIGGER trg_update_guest_reports_report_log
  AFTER INSERT ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_report_with_log_id();

-- Fix the existing broken record
UPDATE public.guest_reports 
SET 
  report_log_id = '08c28a65-1154-4258-974d-ef19140ddf3f',
  has_report_log = true,
  updated_at = now()
WHERE id = 'a8fe0f66-7146-4eba-991f-3a1d27c7edb8';
