-- Drop the trigger that creates API keys on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the handle_new_user function that generates API keys
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop the entire api_keys table since it's causing issues
DROP TABLE IF EXISTS public.api_keys CASCADE;

-- Drop any other API key related functions
DROP FUNCTION IF EXISTS public.regenerate_api_key(uuid);
DROP FUNCTION IF EXISTS public.validate_api_key(text);