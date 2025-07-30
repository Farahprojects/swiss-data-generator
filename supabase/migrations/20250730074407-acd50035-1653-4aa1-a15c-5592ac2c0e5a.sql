-- Create function to automatically update guest_reports when report_logs is inserted with is_guest = true
CREATE OR REPLACE FUNCTION public.link_report_log_to_guest_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a guest report
  IF NEW.is_guest = true AND NEW.user_id IS NOT NULL THEN
    -- Update the corresponding guest_reports record
    UPDATE public.guest_reports
    SET 
      report_log_id = NEW.id,
      has_report_log = true,
      modal_ready = true,
      updated_at = now()
    WHERE id = NEW.user_id::uuid;
    
    -- Log the trigger action for debugging
    INSERT INTO public.debug_logs (source, message, details)
    VALUES (
      'link_report_log_to_guest_report_trigger',
      'Guest report linked via database trigger',
      jsonb_build_object(
        'guest_report_id', NEW.user_id,
        'report_log_id', NEW.id,
        'report_type', NEW.report_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on report_logs table
CREATE TRIGGER trg_link_report_log_to_guest_report
  AFTER INSERT ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.link_report_log_to_guest_report();