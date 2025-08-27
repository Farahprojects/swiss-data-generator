-- Optimized index for fetching the latest N completed, non-empty messages per chat
-- Uses a partial index and includes (role, text) so queries can be index-only scans.
CREATE INDEX IF NOT EXISTS idx_messages_chat_recent_complete_cover
ON public.messages (chat_id, created_at DESC)
INCLUDE (role, text)
WHERE status = 'complete'
  AND text IS NOT NULL
  AND length(text) > 0;