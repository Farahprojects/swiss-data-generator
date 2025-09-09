-- Drop the chat_id column from report_ready_signals
ALTER TABLE public.report_ready_signals DROP COLUMN IF EXISTS chat_id;

-- Re-add the chat_id column
ALTER TABLE public.report_ready_signals ADD COLUMN chat_id uuid;