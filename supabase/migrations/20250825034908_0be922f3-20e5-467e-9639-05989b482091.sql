-- ✅ SECURITY FIX: Remove the overly permissive policy that exposes all API keys
DROP POLICY IF EXISTS "service_role_manage_api_keys" ON public.api_keys;

-- ✅ SECURITY FIX: Ensure only authenticated users can access their own API keys
-- Remove duplicate policies and create clean, secure policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;  
DROP POLICY IF EXISTS "users_read_own_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_update_own_api_keys" ON public.api_keys;

-- ✅ Create secure policies that only allow users to see their own data
CREATE POLICY "Users can view own API keys only"
ON public.api_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys only"  
ON public.api_keys
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ Keep service role access but restrict it properly
CREATE POLICY "Service role full access"
ON public.api_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ✅ Allow authenticated users to insert their own API keys
CREATE POLICY "Users can insert own API keys"
ON public.api_keys  
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);