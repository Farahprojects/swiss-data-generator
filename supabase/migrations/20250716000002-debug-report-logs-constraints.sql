-- Debug function to check report_logs constraints
CREATE OR REPLACE FUNCTION public.check_report_logs_constraints()
RETURNS TABLE (
    constraint_name text,
    constraint_type text,
    column_name text,
    data_type text,
    is_nullable text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.conname::text as constraint_name,
    CASE c.contype
      WHEN 'p' THEN 'PRIMARY KEY'
      WHEN 'f' THEN 'FOREIGN KEY'
      WHEN 'u' THEN 'UNIQUE'
      WHEN 'c' THEN 'CHECK'
      ELSE 'OTHER'
    END::text as constraint_type,
    col.column_name::text,
    col.data_type::text,
    col.is_nullable::text
  FROM information_schema.table_constraints c
  JOIN information_schema.constraint_column_usage ccu ON c.constraint_name = ccu.constraint_name
  JOIN information_schema.columns col ON ccu.table_name = col.table_name AND ccu.column_name = col.column_name
  WHERE c.table_name = 'report_logs' 
    AND col.column_name = 'user_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 