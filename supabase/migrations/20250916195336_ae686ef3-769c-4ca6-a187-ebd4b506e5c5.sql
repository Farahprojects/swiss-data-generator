-- Remove client-related columns from email_messages since it's admin-only now
ALTER TABLE public.email_messages 
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS client_id;

-- Update RLS policies for admin-only access
DROP POLICY IF EXISTS "Users can create their own emails" ON public.email_messages;
DROP POLICY IF EXISTS "Users can delete their own emails" ON public.email_messages;
DROP POLICY IF EXISTS "Users can update their own emails" ON public.email_messages;
DROP POLICY IF EXISTS "Users can view their own emails" ON public.email_messages;

-- Create admin-only policies
CREATE POLICY "Service role can manage all email messages" 
ON public.email_messages 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage all email messages" 
ON public.email_messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);