-- Drop the admin_logs table and log_admin_event function
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP FUNCTION IF EXISTS log_admin_event(text, text, text, uuid, jsonb) CASCADE;