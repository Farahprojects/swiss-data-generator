-- Create temporary audio table for TTS streaming
CREATE TABLE public.temp_audio (
    session_id text PRIMARY KEY,
    audio_url text,
    audio_data bytea,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_temp_audio_updated_at ON public.temp_audio(updated_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_temp_audio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_temp_audio_updated_at 
    BEFORE UPDATE ON public.temp_audio 
    FOR EACH ROW 
    EXECUTE FUNCTION update_temp_audio_updated_at();

-- Enable RLS
ALTER TABLE public.temp_audio ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (since this is temporary data)
CREATE POLICY "Allow all operations on temp_audio" ON public.temp_audio
    FOR ALL USING (true);

-- Function to clean up old audio data (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_temp_audio()
RETURNS void AS $$
BEGIN
    DELETE FROM public.temp_audio 
    WHERE updated_at < now() - interval '24 hours';
END;
$$ language 'plpgsql';

-- Create a cron job to clean up old data (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-temp-audio', '0 */6 * * *', 'SELECT cleanup_old_temp_audio();');
