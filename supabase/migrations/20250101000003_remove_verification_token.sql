-- Remove verification_token system completely
-- This migration removes the old custom verification token system

-- 1. Update handle_new_user function to remove verification_token
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    email_verified,
    created_at,
    updated_at,
    last_seen_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    COALESCE(NEW.created_at, now()),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remove verification_token column from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS verification_token;

-- 3. Drop the index
DROP INDEX IF EXISTS idx_profiles_verification_token;

-- 4. Remove the comment
COMMENT ON COLUMN public.profiles.verification_token IS NULL;
