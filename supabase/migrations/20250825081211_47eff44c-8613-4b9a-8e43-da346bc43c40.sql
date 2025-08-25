-- Drop all remaining API key related triggers and functions with CASCADE
DROP TRIGGER IF EXISTS insert_api_keys_on_user_signup ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_for_api_keys() CASCADE;
DROP FUNCTION IF EXISTS public.sync_api_key_email() CASCADE;

-- Now create the simple user credits function
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