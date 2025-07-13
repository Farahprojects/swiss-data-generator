-- Add missing columns to guest_reports table for PDF functionality

-- Add column to store the generated PDF data
ALTER TABLE public.guest_reports 
ADD COLUMN IF NOT EXISTS report_pdf_data TEXT;

-- Add column to track edge function confirmation
ALTER TABLE public.guest_reports 
ADD COLUMN IF NOT EXISTS edge_function_confirmed BOOLEAN DEFAULT FALSE;

-- Add comments to document the columns
COMMENT ON COLUMN public.guest_reports.report_pdf_data IS 'Base64 encoded PDF data of the generated report';
COMMENT ON COLUMN public.guest_reports.edge_function_confirmed IS 'Set to TRUE by the edge function to confirm it processed this guest report';