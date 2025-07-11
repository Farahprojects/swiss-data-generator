-- Add has_error column to report_logs table
ALTER TABLE public.report_logs 
ADD COLUMN has_error BOOLEAN NOT NULL DEFAULT false;

-- Create trigger function to set has_error when error_message is updated
CREATE OR REPLACE FUNCTION public.set_report_error_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Set has_error to true if error_message is not null and not empty
  IF NEW.error_message IS NOT NULL AND TRIM(NEW.error_message) != '' THEN
    NEW.has_error = true;
  ELSE
    NEW.has_error = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on report_logs table
CREATE TRIGGER trigger_set_report_error_flag
  BEFORE INSERT OR UPDATE ON public.report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_report_error_flag();