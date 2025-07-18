-- Upgrade geo_cache table to support place_id based caching
-- This will clear existing data to prevent conflicts with the new structure

BEGIN;

-- 1. Clear existing data to avoid conflicts
TRUNCATE TABLE public.geo_cache;

-- 2. Add place_id column
ALTER TABLE public.geo_cache ADD COLUMN place_id TEXT;

-- 3. Drop existing primary key and create new one on place_id
ALTER TABLE public.geo_cache DROP CONSTRAINT IF EXISTS geo_cache_pkey;
ALTER TABLE public.geo_cache ADD PRIMARY KEY (place_id);

-- 4. Make place_id NOT NULL
ALTER TABLE public.geo_cache ALTER COLUMN place_id SET NOT NULL;

-- 5. Add comment explaining the new purpose
COMMENT ON TABLE public.geo_cache IS 'Caches Google Place Details API responses using place_id as the key to reduce expensive API calls';

COMMIT;