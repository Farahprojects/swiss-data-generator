-- Create domain_slugs table for email routing validation
CREATE TABLE IF NOT EXISTS public.domain_slugs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain       text UNIQUE NOT NULL,
    
    -- Boolean columns for each allowed slug
    info         boolean DEFAULT false,
    media        boolean DEFAULT false,
    billing      boolean DEFAULT false,
    support      boolean DEFAULT false,
    
    created_at   timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domain_slugs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (edge functions need to read this)
CREATE POLICY "Public can read domain_slugs" 
ON public.domain_slugs 
FOR SELECT 
USING (true);

-- Create policy for service role to manage domain_slugs
CREATE POLICY "Service role can manage domain_slugs" 
ON public.domain_slugs 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Seed the five domains with their slug permissions
INSERT INTO public.domain_slugs (domain, info, media, billing, support)
VALUES
  ('therai.co',    true, true, false, false),
  ('therai.life',  true, false, false, false),
  ('therai.coach', true, true, true,  false),
  ('therai.store', true, false, true,  true),
  ('therai.win',   true, false, false, false)
ON CONFLICT (domain) DO NOTHING;