
-- Drop the existing incorrect trigger that fires on INSERT
DROP TRIGGER IF EXISTS trg_update_guest_reports_report_log ON public.report_logs;

-- Create a new trigger function that only fires when report_text is populated and status is success
CREATE OR REPLACE FUNCTION public.update_guest_report_with_log_id_on_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only proceed if this is the moment when report_text gets populated and status becomes success
  IF (OLD.report_text IS NULL OR OLD.report_text = '') AND 
     NEW.report_text IS NOT NULL AND 
     NEW.report_text != '' AND
     NEW.status = 'success' THEN
    
    -- Update guest_reports with report_log_id and set has_report_log = true
    UPDATE public.guest_reports 
    SET 
      report_log_id = NEW.id,
      has_report_log = true,
      updated_at = now()
    WHERE id::text = NEW.user_id;
    
    -- Log success for debugging
    INSERT INTO debug_logs (source, message, details)
    VALUES (
      'update_guest_report_with_log_id_on_completion',
      'Successfully linked report_log to guest_report',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'report_log_id', NEW.id,
        'guest_report_updated', true
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the update
    INSERT INTO debug_logs (source, message, details)
    VALUES (
      'update_guest_report_with_log_id_on_completion',
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

-- Create the new trigger that fires on UPDATE when report is completed
CREATE TRIGGER trg_update_guest_reports_on_report_completion
  AFTER UPDATE ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_report_with_log_id_on_completion();

-- Fix the current broken record for the test case
UPDATE public.guest_reports 
SET 
  report_log_id = (
    SELECT id FROM public.report_logs 
    WHERE user_id = 'ed7c10e9-844c-4b46-acdc-6f85989ce382' 
    AND status = 'success' 
    AND report_text IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  ),
  has_report_log = true,
  updated_at = now()
WHERE id = 'ed7c10e9-844c-4b46-acdc-6f85989ce382';
