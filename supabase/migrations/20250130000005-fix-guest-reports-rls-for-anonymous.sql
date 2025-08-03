-- Fix RLS policy for guest_reports to allow anonymous inserts
-- The current policy "Users can access own reports" blocks anonymous inserts

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can access own reports" ON guest_reports;

-- Create a new policy that allows:
-- 1. Anonymous inserts (user_id IS NULL)
-- 2. Users to access their own reports (user_id = auth.uid())
-- 3. Service role to manage all reports (for edge functions)
CREATE POLICY "Allow anonymous and authenticated access" 
ON guest_reports FOR ALL 
USING (
  user_id IS NULL OR  -- Allow anonymous guests
  user_id = auth.uid() OR  -- Allow authenticated users to access their own
  auth.role() = 'service_role'  -- Allow service role (edge functions)
); 