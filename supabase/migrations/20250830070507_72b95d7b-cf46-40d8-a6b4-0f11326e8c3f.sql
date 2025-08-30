-- Enable realtime for temp_audio table
ALTER TABLE public.temp_audio REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.temp_audio;