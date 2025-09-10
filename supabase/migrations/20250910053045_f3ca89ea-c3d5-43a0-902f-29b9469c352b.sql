-- Drop ALL policies that depend on guest_reports.chat_id
DROP POLICY IF EXISTS "anon_read_guest_chat_audio" ON chat_audio_clips;
DROP POLICY IF EXISTS "auth_read_own_guest_chat_audio" ON chat_audio_clips;
DROP POLICY IF EXISTS "anon_read_guest_chat_summaries" ON message_block_summaries;
DROP POLICY IF EXISTS "auth_read_own_guest_chat_summaries" ON message_block_summaries;
DROP POLICY IF EXISTS "Anonymous users read messages from guest chats" ON messages;
DROP POLICY IF EXISTS "Anonymous users insert messages to guest chats" ON messages;
DROP POLICY IF EXISTS "Anonymous users update messages in guest chats" ON messages;
DROP POLICY IF EXISTS "Authenticated users insert to own chats" ON messages;
DROP POLICY IF EXISTS "Authenticated users update own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users view own chat messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users view own report signals" ON report_ready_signals;
DROP POLICY IF EXISTS "Authenticated users update own report signals" ON report_ready_signals;

-- Change chat_id column from UUID to TEXT to support guest prefixes
ALTER TABLE guest_reports ALTER COLUMN chat_id TYPE TEXT;