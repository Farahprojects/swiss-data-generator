-- Clean up any remaining references to api_keys that might exist
-- Check for any remaining triggers on auth.users that reference api_keys
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS api_key_trigger ON auth.users;

-- Drop any remaining functions that might reference api_keys
DROP FUNCTION IF EXISTS public.handle_new_user_for_api_keys();
DROP FUNCTION IF EXISTS public.sync_api_key_email();

-- Remove any remaining policies or views that reference api_keys
DROP VIEW IF EXISTS public.api_keys_view CASCADE;

-- Ensure user_credits table exists for new users without api_keys dependency
-- Update the function to only handle user_credits, not api_keys
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert default credits for new users
  INSERT INTO public.user_credits (user_id, balance_usd)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create a simple trigger just for user_credits, no api_keys
CREATE OR REPLACE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();