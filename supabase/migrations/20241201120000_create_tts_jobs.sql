-- Create TTS jobs table for backend rendezvous
CREATE TABLE public.tts_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    chat_id uuid NULL,
    text text NOT NULL,
    voice text DEFAULT 'alloy',
    status text CHECK (status IN ('pending', 'in_progress', 'done', 'failed')) DEFAULT 'pending',
    error text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_tts_jobs_session_status ON public.tts_jobs(session_id, status);
CREATE INDEX idx_tts_jobs_created_at ON public.tts_jobs(created_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tts_jobs_updated_at 
    BEFORE UPDATE ON public.tts_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies (if needed)
ALTER TABLE public.tts_jobs ENABLE ROW LEVEL SECURITY;
