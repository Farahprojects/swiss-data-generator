-- Fix the function to properly link translator_logs to guest_reports
CREATE OR REPLACE FUNCTION public.update_guest_report_with_translator_log()
RETURNS trigger AS $$
BEGIN
  -- When a translator_log is created for a guest, link it to the guest_report
  IF NEW.is_guest = true AND NEW.user_id IS NOT NULL THEN
    UPDATE public.guest_reports 
    SET translator_log_id = NEW.id
    WHERE id = NEW.user_id::uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to call the function after INSERT on translator_logs
DROP TRIGGER IF EXISTS after_insert_translator_log ON public.translator_logs;
CREATE TRIGGER after_insert_translator_log
  AFTER INSERT ON public.translator_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_report_with_translator_log();