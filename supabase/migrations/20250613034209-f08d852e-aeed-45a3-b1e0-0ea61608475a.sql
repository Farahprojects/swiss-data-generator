
-- Create guest_reports table to track guest payments and report generation
CREATE TABLE public.guest_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  report_type TEXT NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  report_content TEXT,
  has_report BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (though this is for guest data, we'll keep it simple)
ALTER TABLE public.guest_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all guest reports
CREATE POLICY "service_role_manage_guest_reports" 
  ON public.guest_reports 
  USING (true);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_guest_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_reports_updated_at
BEFORE UPDATE ON public.guest_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_guest_reports_updated_at();

-- Add index for faster lookups
CREATE INDEX idx_guest_reports_stripe_session_id ON public.guest_reports(stripe_session_id);
CREATE INDEX idx_guest_reports_email ON public.guest_reports(email);
CREATE INDEX idx_guest_reports_has_report ON public.guest_reports(has_report);
