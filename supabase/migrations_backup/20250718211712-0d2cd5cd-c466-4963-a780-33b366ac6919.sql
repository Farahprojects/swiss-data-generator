
-- Add unique constraint on stripe_session_id to prevent duplicate records
ALTER TABLE public.guest_reports 
ADD CONSTRAINT unique_stripe_session_id UNIQUE (stripe_session_id);

-- Add comment to document the constraint purpose
COMMENT ON CONSTRAINT unique_stripe_session_id ON public.guest_reports 
IS 'Prevents duplicate guest reports from the same Stripe session, ensuring idempotent payment processing';
