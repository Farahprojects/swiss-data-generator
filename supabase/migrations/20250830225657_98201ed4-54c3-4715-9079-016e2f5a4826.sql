-- Drop unnecessary columns from chat_audio_clips table
ALTER TABLE public.chat_audio_clips 
DROP COLUMN IF EXISTS session_id,
DROP COLUMN IF EXISTS duration_ms,
DROP COLUMN IF EXISTS mime_type,
DROP COLUMN IF EXISTS text,
DROP COLUMN IF EXISTS message_id;