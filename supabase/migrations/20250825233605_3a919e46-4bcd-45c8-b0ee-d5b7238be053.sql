-- Enable real-time updates for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
-- Add messages table to realtime publication
ALTER publication supabase_realtime ADD TABLE public.messages;