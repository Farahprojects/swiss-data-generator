-- Drop verification_status column from profiles table (redundant with email_verified boolean)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS verification_status;

-- Drop the enum type if it's no longer used
DROP TYPE IF EXISTS public.verification_status_type;
