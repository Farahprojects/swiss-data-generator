
-- Create trigger function to handle promo code increment when payment status changes to 'paid'
CREATE OR REPLACE FUNCTION increment_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when payment_status changes from 'pending' to 'paid' 
  -- and promo_code_used is not null
  IF OLD.payment_status = 'pending' 
     AND NEW.payment_status = 'paid' 
     AND NEW.promo_code_used IS NOT NULL THEN
    
    -- Atomically increment promo code usage with optimistic locking
    -- This prevents race conditions and ensures accurate counting
    UPDATE promo_codes 
    SET times_used = times_used + 1
    WHERE code = NEW.promo_code_used
      AND is_active = true
      AND (max_uses IS NULL OR times_used < max_uses);
    
    -- Log the promo code increment for debugging
    INSERT INTO debug_logs (source, message, details)
    VALUES (
      'increment_promo_code_usage_trigger',
      'Promo code usage incremented via database trigger',
      jsonb_build_object(
        'guest_report_id', NEW.id,
        'promo_code', NEW.promo_code_used,
        'payment_status_change', 'pending -> paid'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the AFTER UPDATE trigger on guest_reports table
CREATE TRIGGER trigger_increment_promo_code_usage
  AFTER UPDATE ON guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION increment_promo_code_usage();

-- Add comment to document the trigger purpose
COMMENT ON TRIGGER trigger_increment_promo_code_usage ON guest_reports IS 
'Automatically increments promo_codes.times_used when guest_reports.payment_status changes from pending to paid and promo_code_used is not null. Uses optimistic locking to prevent race conditions.';
