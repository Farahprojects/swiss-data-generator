-- Fix translator_logs user_id type issue
-- The error "operator does not exist: text = uuid" suggests there's a type mismatch

-- First, let's check if user_id column exists and its current type
DO $$
BEGIN
  -- Check if user_id column exists in translator_logs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'translator_logs' 
    AND column_name = 'user_id'
  ) THEN
    -- Check if it's already UUID type
    IF (
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'translator_logs' 
      AND column_name = 'user_id'
    ) != 'uuid' THEN
      
      -- Convert user_id to UUID type if it's not already
      ALTER TABLE public.translator_logs 
      ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
      
      RAISE NOTICE 'Converted translator_logs.user_id to UUID type';
    ELSE
      RAISE NOTICE 'translator_logs.user_id is already UUID type';
    END IF;
  ELSE
    RAISE NOTICE 'user_id column does not exist in translator_logs';
  END IF;
END $$;

-- Add foreign key constraint to guest_reports if it doesn't exist
DO $$
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'translator_logs_user_id_guest_reports_fkey'
    AND table_name = 'translator_logs'
  ) THEN
    -- Add foreign key constraint to guest_reports
    ALTER TABLE public.translator_logs 
    ADD CONSTRAINT translator_logs_user_id_guest_reports_fkey 
    FOREIGN KEY (user_id) REFERENCES public.guest_reports(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added foreign key constraint translator_logs_user_id_guest_reports_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint translator_logs_user_id_guest_reports_fkey already exists';
  END IF;
END $$;

-- Create trigger to update guest_reports.translator_log_id when translator_logs are inserted
CREATE OR REPLACE FUNCTION public.update_guest_report_translator_log_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update guest_reports with translator_log_id if this is a guest report
  IF NEW.is_guest = true AND NEW.user_id IS NOT NULL THEN
    UPDATE public.guest_reports 
    SET translator_log_id = NEW.id
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for translator_logs inserts
DROP TRIGGER IF EXISTS update_guest_report_translator_log_reference_trigger ON public.translator_logs;
CREATE TRIGGER update_guest_report_translator_log_reference_trigger
  AFTER INSERT ON public.translator_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_report_translator_log_reference(); 