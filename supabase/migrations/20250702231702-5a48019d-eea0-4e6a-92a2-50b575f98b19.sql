-- Create user_errors table to log failed report cases
CREATE TABLE public.user_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_report_id UUID NULL,
  email TEXT NOT NULL,
  error_type TEXT NOT NULL DEFAULT 'report_not_found',
  price_paid NUMERIC NULL,
  error_message TEXT NULL,
  case_number TEXT NOT NULL DEFAULT ('CASE_' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  metadata JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.user_errors ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all errors
CREATE POLICY "Service role can manage user errors" 
ON public.user_errors 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow authenticated users to view errors (for support purposes)
CREATE POLICY "Authenticated users can view user errors" 
ON public.user_errors 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create index for efficient lookups
CREATE INDEX idx_user_errors_email ON public.user_errors(email);
CREATE INDEX idx_user_errors_case_number ON public.user_errors(case_number);
CREATE INDEX idx_user_errors_created_at ON public.user_errors(created_at DESC);