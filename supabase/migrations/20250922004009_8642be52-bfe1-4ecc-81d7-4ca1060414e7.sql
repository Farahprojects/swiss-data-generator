-- Drop the tables that were just created

-- Drop clients table and its related objects
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP POLICY IF EXISTS "Coaches can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can create clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can delete their own clients" ON public.clients;
DROP TABLE IF EXISTS public.clients CASCADE;

-- Drop api_keys table and its related objects
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
DROP TABLE IF EXISTS public.api_keys CASCADE;

-- Drop guest_reports table and its related objects
DROP TRIGGER IF EXISTS update_guest_reports_updated_at ON public.guest_reports;
DROP POLICY IF EXISTS "Service role can manage guest reports" ON public.guest_reports;
DROP TABLE IF EXISTS public.guest_reports CASCADE;