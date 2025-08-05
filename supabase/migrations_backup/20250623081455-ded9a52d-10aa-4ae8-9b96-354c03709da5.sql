
-- Add engine_used column to translator_logs table to track which report engine was used
ALTER TABLE public.translator_logs 
ADD COLUMN engine_used text;

-- Add an index for faster queries on engine_used
CREATE INDEX IF NOT EXISTS idx_translator_logs_engine_used ON public.translator_logs(engine_used);
