
-- Add column to store the generated PDF data
ALTER TABLE public.guest_reports 
ADD COLUMN report_pdf_data TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.guest_reports.report_pdf_data IS 'Base64 encoded PDF data of the generated report';
