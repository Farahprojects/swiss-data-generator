-- Fix the trigger function to only UPDATE existing guest_reports records
-- Remove the problematic UPSERT logic that tries to INSERT new records

CREATE OR REPLACE FUNCTION public.update_guest_report_with_log_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only UPDATE existing guest_reports records, don't INSERT new ones
  -- This prevents constraint violations for required fields like stripe_session_id
  UPDATE public.guest_reports
  SET 
    report_log_id = NEW.id,
    updated_at = now()
  WHERE id::text = NEW.user_id
    AND report_log_id IS NULL; -- Only update if not already set
  
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