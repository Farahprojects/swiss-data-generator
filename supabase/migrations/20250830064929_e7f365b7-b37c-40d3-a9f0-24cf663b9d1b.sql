-- Add index on temp_audio.chat_id for faster WebSocket delivery
CREATE INDEX IF NOT EXISTS idx_temp_audio_chat_id ON public.temp_audio(chat_id);

-- Add index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_temp_audio_created_at ON public.temp_audio(created_at DESC);

-- Add composite index for chat_id and created_at for optimal performance
CREATE INDEX IF NOT EXISTS idx_temp_audio_chat_id_created_at ON public.temp_audio(chat_id, created_at DESC);