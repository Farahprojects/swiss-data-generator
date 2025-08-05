
-- Update the link_translator_log_to_guest_report function to also set swiss_boolean = true
CREATE OR REPLACE FUNCTION link_translator_log_to_guest_report()
RETURNS TRIGGER AS $$
DECLARE
  guest_report_exists boolean;
  rows_updated integer;
BEGIN
  -- Only proceed if this is a guest log (is_guest = true) and user_id is not null
  IF NEW.is_guest = true AND NEW.user_id IS NOT NULL THEN
    
    -- Check if guest_report exists
    SELECT EXISTS(SELECT 1 FROM guest_reports WHERE id = NEW.user_id) INTO guest_report_exists;
    
    -- Update guest_reports.translator_log_id AND swiss_boolean where id matches user_id
    UPDATE guest_reports 
    SET translator_log_id = NEW.id,
        swiss_boolean = true
    WHERE id = NEW.user_id;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Log the linking attempt for debugging
    RAISE NOTICE 'Linking translator_log % to guest_report % (user_id: %). Guest report exists: %, Rows updated: %, swiss_boolean set to true', 
      NEW.id, NEW.user_id, NEW.user_id, guest_report_exists, rows_updated;
      
  ELSE
    -- Log when trigger doesn't fire
    RAISE NOTICE 'Trigger skipped: is_guest = %, user_id = %', 
      NEW.is_guest, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the update_guest_report_log_reference function to also set has_report_log = true
CREATE OR REPLACE FUNCTION public.update_guest_report_log_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update guest_reports with report_log_id AND has_report_log if this is a guest report
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.guest_reports 
    SET report_log_id = NEW.id,
        has_report_log = true
    WHERE id::text = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;
