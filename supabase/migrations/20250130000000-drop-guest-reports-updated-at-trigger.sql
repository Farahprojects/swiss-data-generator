-- Drop the trigger and function that reference the deleted updated_at column
DROP TRIGGER IF EXISTS update_guest_reports_updated_at ON public.guest_reports;
DROP FUNCTION IF EXISTS public.update_guest_reports_updated_at(); 