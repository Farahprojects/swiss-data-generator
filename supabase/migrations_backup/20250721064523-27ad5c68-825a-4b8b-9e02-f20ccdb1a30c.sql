
-- Add user_error_id column to guest_reports table to link error records
ALTER TABLE public.guest_reports 
ADD COLUMN user_error_id UUID REFERENCES public.user_errors(id);

-- Add index for better performance on error lookups
CREATE INDEX idx_guest_reports_user_error_id ON public.guest_reports(user_error_id);

-- Add comment to document the column
COMMENT ON COLUMN public.guest_reports.user_error_id IS 'Links to user_errors table when Swiss processing errors occur';
