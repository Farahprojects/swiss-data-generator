
-- Add engine_used column to track which edge function was used for each report
ALTER TABLE public.report_logs 
ADD COLUMN engine_used text;

-- Add an index on created_at for faster queries when finding the last used engine
CREATE INDEX IF NOT EXISTS idx_report_logs_created_at ON public.report_logs(created_at DESC);
