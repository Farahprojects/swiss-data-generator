-- Enable Realtime Broadcast for conversation channel
-- This allows real-time communication between clients via broadcast messages

-- First, ensure the realtime extension is enabled (should already be enabled in Supabase)
-- No need to create/enable extension as it's managed by Supabase

-- Enable realtime for broadcast functionality on the conversation channel
-- Broadcast doesn't require specific table configurations like postgres_changes
-- The channel "conversation" will be available for broadcast messages

-- Add a simple table to track active conversations if needed for debugging
CREATE TABLE IF NOT EXISTS public.conversation_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name TEXT NOT NULL,
  message_type TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for the broadcasts table
ALTER TABLE public.conversation_broadcasts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read broadcast logs
CREATE POLICY "Users can view conversation broadcasts" 
ON public.conversation_broadcasts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert broadcast logs (for debugging)
CREATE POLICY "Users can create conversation broadcasts" 
ON public.conversation_broadcasts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);