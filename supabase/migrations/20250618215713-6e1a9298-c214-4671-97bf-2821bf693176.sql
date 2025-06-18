
-- Enable Row Level Security on email_messages table
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_messages table so users can manage their own emails
CREATE POLICY "Users can view their own emails" 
  ON public.email_messages 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emails" 
  ON public.email_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" 
  ON public.email_messages 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails" 
  ON public.email_messages 
  FOR DELETE 
  USING (auth.uid() = user_id);
