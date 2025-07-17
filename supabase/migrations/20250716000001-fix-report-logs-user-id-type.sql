-- Fix report_logs user_id type to TEXT
-- This ensures guest report IDs can be stored as strings

-- First, check if user_id column exists and its current type
DO $$
BEGIN
  -- Check if user_id column exists in report_logs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_logs' 
    AND column_name = 'user_id'
  ) THEN
    -- Check if it's already TEXT type
    IF (
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'report_logs' 
      AND column_name = 'user_id'
    ) != 'text' THEN
      
      -- Convert user_id to TEXT type if it's not already
      ALTER TABLE public.report_logs 
      ALTER COLUMN user_id TYPE text USING user_id::text;
      
      RAISE NOTICE 'Converted report_logs.user_id to TEXT type';
    ELSE
      RAISE NOTICE 'report_logs.user_id is already TEXT type';
    END IF;
  ELSE
    RAISE NOTICE 'user_id column does not exist in report_logs';
  END IF;
END $$;

-- Drop any existing foreign key constraints on user_id if they exist
ALTER TABLE public.report_logs
  DROP CONSTRAINT IF EXISTS report_logs_user_id_fkey;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.report_logs.user_id IS 'Stores user_id as TEXT - can be auth user UUID or guest report UUID string'; 