-- Add checkout_url field to guest_reports table
-- This allows us to resume Stripe checkout sessions when users cancel and want to retry

ALTER TABLE public.guest_reports 
ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_guest_reports_checkout_url 
ON public.guest_reports(checkout_url) 
WHERE checkout_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.guest_reports.checkout_url IS 'Stripe checkout URL for resuming payment sessions';
