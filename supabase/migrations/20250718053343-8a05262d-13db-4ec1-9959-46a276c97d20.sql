-- Clean up: Remove the old autocomplete_cache table since we now use geo_cache for place details caching
-- and the autocomplete function no longer uses caching

DROP TABLE IF EXISTS public.autocomplete_cache;