-- Add verification_token column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_token text;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_verification_token 
ON public.profiles(verification_token) 
WHERE verification_token IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.verification_token IS 'Custom email verification token generated during signup';
