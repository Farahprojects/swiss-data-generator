-- Remove the log_admin_event function
DROP FUNCTION IF EXISTS public.log_admin_event(text, text, text, uuid, jsonb);