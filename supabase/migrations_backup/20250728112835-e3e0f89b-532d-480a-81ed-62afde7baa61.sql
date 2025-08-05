-- Drop the restrictive policy that's blocking anonymous access
DROP POLICY IF EXISTS "allow_select_with_valid_promo" ON guest_reports;

-- Create secure realtime-compatible policy for anonymous users
CREATE POLICY "Allow anon to select by guest_report_id"
ON guest_reports
FOR SELECT
TO anon
USING (
  id = (current_setting('realtime.subscription_parameters', true)::jsonb->>'guest_report_id')::uuid
);