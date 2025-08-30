-- Create temp_audio table for TTS audio storage
CREATE TABLE IF NOT EXISTS public.temp_audio (
  session_id TEXT PRIMARY KEY,
  audio_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temp_audio ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_manage_temp_audio" 
  ON public.temp_audio 
  FOR ALL 
  USING (true);