-- Allow anonymous users to insert error logs (for guest reports)
CREATE POLICY "Allow anonymous users to insert error logs" 
ON public.user_errors 
FOR INSERT 
WITH CHECK (true);