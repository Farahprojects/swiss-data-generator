-- Step 1: Add foreign key columns to guest_reports
ALTER TABLE public.guest_reports 
ADD COLUMN translator_log_id UUID REFERENCES public.translator_logs(id),
ADD COLUMN report_log_id UUID REFERENCES public.report_logs(id);

-- Step 2: Drop the PDF processor trigger that depends on swiss_data
DROP TRIGGER IF EXISTS call_pdf_processor_trigger ON public.guest_reports;

-- Step 3: Remove the extract_report_content trigger (no longer needed)
DROP TRIGGER IF EXISTS extract_report_content_trigger ON public.guest_reports;

-- Step 4: Drop the duplicate text columns 
ALTER TABLE public.guest_reports 
DROP COLUMN IF EXISTS swiss_data CASCADE,
DROP COLUMN IF EXISTS report_content CASCADE;