-- Create a function to safely get the next sequence value
-- This provides a clean interface for the edge functions to access the sequence
CREATE OR REPLACE FUNCTION get_next_engine_sequence()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT nextval('engine_selector_seq');
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_engine_sequence() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_engine_sequence() TO service_role; 