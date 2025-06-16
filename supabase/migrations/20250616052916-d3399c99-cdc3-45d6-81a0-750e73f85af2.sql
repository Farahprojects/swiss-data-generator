
-- Add promo_code_used field to guest_reports table to track which promo code was used
ALTER TABLE public.guest_reports 
ADD COLUMN promo_code_used text;

-- Create index for better query performance on promo code lookups
CREATE INDEX idx_guest_reports_promo_code ON public.guest_reports(promo_code_used);
