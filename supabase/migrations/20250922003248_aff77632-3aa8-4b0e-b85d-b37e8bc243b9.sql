-- Phase 1: Fix Critical Security - Create missing tables and update RLS policies

-- Create the clients table that's referenced in the code
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date TEXT,
  birth_time TEXT,
  birth_location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table - authenticated users only
CREATE POLICY "Coaches can view their own clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own clients" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own clients" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = coach_id);

-- Create the api_keys table that's referenced in insights service
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on api_keys table
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for api_keys table - authenticated users only
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update profiles table RLS policies to require authentication instead of public access
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id AND auth.role() = 'authenticated')
WITH CHECK (auth.uid() = id AND auth.role() = 'authenticated');

-- Update other sensitive tables to require authentication
DROP POLICY IF EXISTS "Public can read domain_slugs" ON public.domain_slugs;

CREATE POLICY "Authenticated users can read domain_slugs" 
ON public.domain_slugs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update legal documents to still allow public read (this is typically needed)
-- but we'll keep it restrictive for other operations
DROP POLICY IF EXISTS "Allow public to read legal documents" ON public.legal_documents;

CREATE POLICY "Public can read current legal documents" 
ON public.legal_documents 
FOR SELECT 
USING (is_current = true);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();