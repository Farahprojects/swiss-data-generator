-- Create missing guest_reports table referenced in urlHelpers
CREATE TABLE IF NOT EXISTS public.guest_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  report_data JSONB,
  has_report_log BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guest_reports table
ALTER TABLE public.guest_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for guest_reports table - service role access for now
CREATE POLICY "Service role can manage guest reports" 
ON public.guest_reports 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add updated_at trigger for guest_reports
CREATE TRIGGER update_guest_reports_updated_at
  BEFORE UPDATE ON public.guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();