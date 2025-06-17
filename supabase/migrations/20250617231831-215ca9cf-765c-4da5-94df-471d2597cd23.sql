
-- Add engine_used column to report_logs table
ALTER TABLE public.report_logs 
ADD COLUMN engine_used TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.report_logs.engine_used IS 'The AI engine used to generate the report (e.g., openai-gpt4o, gemini-2.5-flash)';
