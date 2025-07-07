-- Remove swiss_payload column from report_logs table since it's duplicated in translator_logs
ALTER TABLE public.report_logs DROP COLUMN swiss_payload;