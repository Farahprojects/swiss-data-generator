
-- Add a column that the edge function will update to confirm it was called
ALTER TABLE public.guest_reports 
ADD COLUMN edge_function_confirmed BOOLEAN DEFAULT FALSE;

-- Add a comment to document the column
COMMENT ON COLUMN public.guest_reports.edge_function_confirmed IS 'Set to TRUE by the edge function to confirm it processed this guest report';
