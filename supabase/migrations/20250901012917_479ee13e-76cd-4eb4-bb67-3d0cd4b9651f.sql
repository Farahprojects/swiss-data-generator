-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT '10_monthly',
ADD COLUMN IF NOT EXISTS subscription_next_charge timestamptz,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS last_payment_status text,
ADD COLUMN IF NOT EXISTS last_invoice_id text;

-- Create index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_next_charge 
ON public.profiles(subscription_next_charge);

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id 
ON public.profiles(stripe_subscription_id);