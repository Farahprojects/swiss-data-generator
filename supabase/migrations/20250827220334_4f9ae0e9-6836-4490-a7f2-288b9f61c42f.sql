-- Optimized index for fetching the latest N completed messages per chat
-- Uses a partial index without including text to avoid size limits
CREATE INDEX IF NOT EXISTS idx_messages_chat_recent_complete
ON public.messages (chat_id, created_at DESC)
WHERE status = 'complete'
  AND text IS NOT NULL
  AND length(text) > 0;