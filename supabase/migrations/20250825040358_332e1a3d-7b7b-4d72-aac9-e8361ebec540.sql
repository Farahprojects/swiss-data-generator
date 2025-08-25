-- ✅ SECURITY FIX: Remove dangerous policy exposing customer email addresses
DROP POLICY IF EXISTS "Allow anon to select by guest_report_id" ON public.guest_reports;

-- ✅ SECURITY FIX: Create secure policies for guest reports
-- Users should only access their own reports

-- Allow authenticated users to view only their own guest reports
CREATE POLICY "Authenticated users view own guest reports"
ON public.guest_reports
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow authenticated users to update their own guest reports
CREATE POLICY "Authenticated users update own guest reports"
ON public.guest_reports
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role retains full management access for legitimate operations
-- (This policy already exists and is secure)

-- ✅ Ensure no public/anonymous access to customer email addresses
REVOKE ALL ON public.guest_reports FROM anon;
REVOKE ALL ON public.guest_reports FROM public;