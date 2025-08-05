
-- Add swiss_data column to guest_reports table
ALTER TABLE public.guest_reports 
ADD COLUMN swiss_data JSONB DEFAULT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.guest_reports.swiss_data IS 'Stores Swiss ephemeris data related to the guest report';
