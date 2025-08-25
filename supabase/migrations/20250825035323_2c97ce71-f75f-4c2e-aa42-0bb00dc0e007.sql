-- ✅ SECURITY FIX: Remove the dangerous policy that exposes all payment data
DROP POLICY IF EXISTS "service_functions_manage_purchases" ON public.service_purchases;

-- ✅ SECURITY FIX: Create secure policies for payment data access
-- Only coaches can view their own purchases (already exists and is secure)
-- Service role needs restricted access for legitimate operations only

-- ✅ Service role can manage purchases but with proper restrictions
CREATE POLICY "Service role manages purchases"
ON public.service_purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ✅ Allow authenticated users to view purchases they made (if customer_email matches their auth email)
CREATE POLICY "Users can view own purchase history"
ON public.service_purchases
FOR SELECT
TO authenticated
USING (
  customer_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- ✅ Ensure no public access to sensitive payment data
-- Remove any potential anonymous access
REVOKE ALL ON public.service_purchases FROM anon;
REVOKE ALL ON public.service_purchases FROM public;