-- ✅ SECURITY FIX: Remove dangerous policy exposing report status data
DROP POLICY IF EXISTS "public_can_read_report_ready_signals" ON public.report_ready_signals;

-- ✅ SECURITY FIX: Create secure policies for report ready signals
-- Users should only access signals for their own reports

-- Allow authenticated users to view only signals for their own reports
CREATE POLICY "Authenticated users view own report signals"
ON public.report_ready_signals
FOR SELECT
TO authenticated
USING (
  guest_report_id IN (
    SELECT id FROM public.guest_reports 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update seen status on their own signals
CREATE POLICY "Authenticated users update own report signals"
ON public.report_ready_signals
FOR UPDATE
TO authenticated
USING (
  guest_report_id IN (
    SELECT id FROM public.guest_reports 
    WHERE user_id = auth.uid()
  )
);

-- Service role retains management access for legitimate operations
-- (This policy already exists and is secure)

-- ✅ Ensure no public/anonymous access to report status data
REVOKE ALL ON public.report_ready_signals FROM anon;
REVOKE ALL ON public.report_ready_signals FROM public;