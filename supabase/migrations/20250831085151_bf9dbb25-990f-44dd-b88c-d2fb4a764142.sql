
-- 1) Enum for verification states
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_type') THEN
    CREATE TYPE public.verification_status_type AS ENUM ('pending', 'verified', 'blocked');
  END IF;
END$$;

-- 2) Profiles table (source of truth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,                                   -- auth.users.id
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  verification_status public.verification_status_type NOT NULL DEFAULT 'pending',
  subscription_plan text NOT NULL DEFAULT 'free',
  subscription_status text NOT NULL DEFAULT 'inactive',
  stripe_customer_id text,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_unique UNIQUE (email),
  CONSTRAINT profiles_id_fk_auth_users
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3) Indexes that commonly help
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles (stripe_customer_id);

-- 4) RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Only service role can manage profiles (insert/update/delete)
DROP POLICY IF EXISTS profiles_service_role_all ON public.profiles;
CREATE POLICY profiles_service_role_all
  ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5) Updated_at trigger (reuse existing helper if present, otherwise create)
-- Using existing function if available: public.update_updated_at_column()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 6) Helper to get auth email (already exists): public.get_user_email_by_id(user_id_param uuid)
-- We'll reuse it in the RPCs.

-- 7) RPC: Ensure profile exists for current authenticated user
CREATE OR REPLACE FUNCTION public.ensure_profile_for_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get email from auth.users via existing helper
  uemail := public.get_user_email_by_id(uid);

  -- Create if missing; if exists, hydrate email if empty
  INSERT INTO public.profiles (id, email)
  VALUES (uid, COALESCE(uemail, ''))
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email);

END;
$$;

-- 8) RPC: Mark profile as verified based on auth.users.email_confirmed_at
CREATE OR REPLACE FUNCTION public.mark_profile_verified(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmed_at timestamptz;
  effective_user uuid := user_id;
BEGIN
  IF effective_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read from auth.users (allowed in SECURITY DEFINER)
  SELECT u.email_confirmed_at
  INTO confirmed_at
  FROM auth.users u
  WHERE u.id = effective_user;

  IF confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET email_verified = true,
        verification_status = 'verified',
        updated_at = now()
    WHERE id = effective_user;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 9) RPC: Check if user is verified (simple gate)
CREATE OR REPLACE FUNCTION public.is_user_verified(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email_verified FROM public.profiles WHERE id = _user_id),
    false
  );
$$;
