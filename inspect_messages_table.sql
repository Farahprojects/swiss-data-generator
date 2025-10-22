-- Get detailed info about messages table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- Show indexes on messages table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY indexname;

-- Show RLS policies on messages table
SELECT
    schemaname,
    tablename,
    policyname AS policy_name,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY policyname;

-- Check table settings
SELECT
    relname AS table_name,
    relreplident AS replica_identity
FROM pg_class
WHERE relname = 'messages'
  AND relnamespace = 'public'::regnamespace;

-- Check for triggers
SELECT
    tgname AS trigger_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
  AND tgisinternal = false
ORDER BY tgname;

