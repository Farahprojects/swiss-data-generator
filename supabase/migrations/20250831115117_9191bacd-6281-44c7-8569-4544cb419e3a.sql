-- Fix the handle_new_user function to NOT automatically verify users
-- Users should start as unverified until proper verification flow is implemented
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    false, -- Always start as unverified
    'pending'::public.verification_status_type, -- Always start as pending
    COALESCE(NEW.created_at, now()),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log, but do NOT block signup
  INSERT INTO public.debug_logs (source, message, details)
  VALUES (
    'handle_new_user',
    'Failed to insert/update profile on signup',
    jsonb_build_object(
      'error', SQLERRM,
      'auth_user_id', NEW.id,
      'email', NEW.email
    )
  );
  RETURN NEW;
END;
$$;

-- Also update sync_user_verification_status to NOT automatically verify
-- This should only be called when verification is explicitly done
CREATE OR REPLACE FUNCTION public.sync_user_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if there are actual changes, don't auto-verify
  IF OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
    UPDATE public.profiles
    SET 
      updated_at = now()
      -- Remove automatic verification logic
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.debug_logs (source, message, details)
  VALUES (
    'sync_user_verification_status',
    'Failed to sync verification status',
    jsonb_build_object(
      'error', SQLERRM,
      'auth_user_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$;