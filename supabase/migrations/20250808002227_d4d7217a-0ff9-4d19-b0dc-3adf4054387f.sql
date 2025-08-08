-- Add email_sent_at timestamp to guest_reports
ALTER TABLE public.guest_reports 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE NULL;

-- Optional index to query sent dates efficiently
CREATE INDEX IF NOT EXISTS idx_guest_reports_email_sent_at ON public.guest_reports(email_sent_at);
