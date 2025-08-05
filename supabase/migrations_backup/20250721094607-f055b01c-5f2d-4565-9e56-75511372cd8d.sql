
-- Fix the duplicate report_logs issue by adding a unique constraint
-- and updating the trigger function to use UPSERT logic

-- First, clean up any existing duplicate entries
DELETE FROM public.report_logs 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.report_logs 
    WHERE user_id IS NOT NULL
  ) t 
  WHERE t.rn > 1
);

-- Add a unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_logs_user_id_unique 
ON public.report_logs (user_id) 
WHERE user_id IS NOT NULL;

-- Update the trigger function to use UPSERT logic
CREATE OR REPLACE FUNCTION public.update_guest_report_with_log_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Use UPSERT logic to prevent conflicts
  INSERT INTO public.guest_reports (id, report_log_id)
  VALUES (NEW.user_id::uuid, NEW.id)
  ON CONFLICT (id) 
  DO UPDATE SET 
    report_log_id = NEW.id,
    updated_at = now()
  WHERE guest_reports.report_log_id IS NULL; -- Only update if not already set
  
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
