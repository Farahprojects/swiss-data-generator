
-- Add guest_bypass column to api_keys table
ALTER TABLE public.api_keys 
ADD COLUMN guest_bypass boolean NOT NULL DEFAULT false;

-- Add a comment to explain the column's purpose
COMMENT ON COLUMN public.api_keys.guest_bypass IS 'When true, allows this API key to process guest reports without deducting credits';
