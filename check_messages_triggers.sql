-- Check for any triggers on messages table
SELECT
    tgname AS trigger_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
  AND tgisinternal = false
ORDER BY tgname;

