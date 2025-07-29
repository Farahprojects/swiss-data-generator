-- Add metadata column to report_logs table for AI generation metrics
ALTER TABLE report_logs 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN report_logs.metadata IS 'AI generation metrics including duration_ms and token_count'; 