-- Remove NOT NULL constraints from all columns that should be optional during user creation
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN email_verified DROP NOT NULL,
ALTER COLUMN verification_status DROP NOT NULL,
ALTER COLUMN updated_at DROP NOT NULL,
ALTER COLUMN last_seen_at DROP NOT NULL;

-- Update the handle_new_user trigger function to work with the proper types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    email_verified,
    verification_status,
    created_at,
    updated_at,
    last_seen_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified'::verification_status_type ELSE 'pending'::verification_status_type END,
    COALESCE(NEW.created_at, now()),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    verification_status = EXCLUDED.verification_status,
    updated_at = now();
  
  RETURN NEW;
END;
$$;