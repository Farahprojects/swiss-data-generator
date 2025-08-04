-- Add is_ai_report column to report_ready_signals table
-- This allows the UI to distinguish between AI reports and astro data only reports

-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.report_ready_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_report_id UUID NOT NULL,
  is_ai_report BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add the is_ai_report column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'report_ready_signals' 
        AND column_name = 'is_ai_report'
    ) THEN
        ALTER TABLE public.report_ready_signals 
        ADD COLUMN is_ai_report BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_ai_report column to report_ready_signals table';
    ELSE
        RAISE NOTICE 'is_ai_report column already exists in report_ready_signals table';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_report_ready_signals_guest_report_id 
ON public.report_ready_signals(guest_report_id);

CREATE INDEX IF NOT EXISTS idx_report_ready_signals_is_ai_report 
ON public.report_ready_signals(is_ai_report);

-- Enable RLS
ALTER TABLE public.report_ready_signals ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "service_role_manage_report_ready_signals" 
  ON public.report_ready_signals 
  USING (true); 