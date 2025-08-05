-- Remove response_text column from swissdebuglogs table since it's duplicated in translator_logs
ALTER TABLE public.swissdebuglogs DROP COLUMN response_text;