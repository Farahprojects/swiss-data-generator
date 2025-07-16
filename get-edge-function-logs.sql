-- Get Edge Function logs for verify-guest-payment
-- This queries the Supabase logs table for the function execution

-- Method 1: Direct logs table query (if available)
SELECT 
  timestamp,
  level,
  message,
  function_name,
  execution_id
FROM logs 
WHERE function_name = 'verify-guest-payment'
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 50;

-- Method 2: Check if there's a specific edge function logs table
SELECT 
  table_name,
  column_name
FROM information_schema.columns 
WHERE table_name LIKE '%edge%' 
  OR table_name LIKE '%function%'
  OR table_name LIKE '%log%'
ORDER BY table_name, ordinal_position;

-- Method 3: Check for any logs table with function data
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%log%'
ORDER BY table_name;

-- Method 4: If logs are stored in a JSON column somewhere
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE data_type = 'json' 
  AND table_schema = 'public'
ORDER BY table_name, column_name; 