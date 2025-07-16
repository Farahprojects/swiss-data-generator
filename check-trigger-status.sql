-- Check if the trigger is properly installed
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trg_translator_logs_link_guest_report';

-- Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'link_translator_log_to_guest_report'; 