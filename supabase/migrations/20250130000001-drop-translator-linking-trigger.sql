-- Drop the translator linking trigger that's causing updated_at errors
DROP TRIGGER IF EXISTS trg_translator_logs_link_guest_report ON translator_logs;
DROP FUNCTION IF EXISTS link_translator_log_to_guest_report(); 