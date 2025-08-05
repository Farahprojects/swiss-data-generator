
-- Add swiss_error boolean column to translator_logs table
ALTER TABLE public.translator_logs 
ADD COLUMN swiss_error BOOLEAN DEFAULT FALSE;

-- Update existing records to set swiss_error based on response_status
UPDATE public.translator_logs 
SET swiss_error = TRUE 
WHERE response_status != 200;
