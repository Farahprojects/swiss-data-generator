-- Migration: Rename user_id to chat_id in translator_logs and report_logs
-- This makes the architecture clearer: chat_id represents the context (conversation, user profile, or report)

-- ============================================================================
-- TRANSLATOR_LOGS: Rename user_id to chat_id
-- ============================================================================

-- Rename the column
ALTER TABLE public.translator_logs 
  RENAME COLUMN user_id TO chat_id;

-- Update the column comment
COMMENT ON COLUMN public.translator_logs.chat_id IS 
  'Context ID: can be conversation_id (astro mode), user_id (profile flow), or report_id (insights)';

-- Drop old index and create new one
DROP INDEX IF EXISTS idx_translator_logs_user_id;
CREATE INDEX IF NOT EXISTS idx_translator_logs_chat_id ON public.translator_logs(chat_id);

-- ============================================================================
-- REPORT_LOGS: Rename user_id to chat_id
-- ============================================================================

-- Rename the column
ALTER TABLE public.report_logs 
  RENAME COLUMN user_id TO chat_id;

-- Update the column comment
COMMENT ON COLUMN public.report_logs.chat_id IS 
  'Context ID: can be conversation_id (astro mode), user_id (profile flow), report_id (insights), or guest_report_id (guest flow)';

-- Drop old index and create new one
DROP INDEX IF EXISTS idx_report_logs_user_id;
CREATE INDEX IF NOT EXISTS idx_report_logs_chat_id ON public.report_logs(chat_id);

