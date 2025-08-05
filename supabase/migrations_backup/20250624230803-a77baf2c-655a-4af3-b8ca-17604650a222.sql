
-- Create service_purchases table to track all coach service purchases
CREATE TABLE public.service_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coach_slug TEXT NOT NULL,
  service_title TEXT NOT NULL,
  service_description TEXT,
  service_price_original TEXT NOT NULL, -- Original price string from service
  amount_cents INTEGER NOT NULL, -- Actual amount charged in cents
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  coach_payout_cents INTEGER NOT NULL DEFAULT 0,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  stripe_customer_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  purchase_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row-Level Security
ALTER TABLE public.service_purchases ENABLE ROW LEVEL SECURITY;

-- Create policy for coaches to view their own service purchases
CREATE POLICY "coaches_view_own_purchases" ON public.service_purchases
  FOR SELECT
  USING (coach_id = auth.uid());

-- Create policy for service functions to insert/update purchases
CREATE POLICY "service_functions_manage_purchases" ON public.service_purchases
  FOR ALL
  USING (true);

-- Create indexes for efficient querying
CREATE INDEX idx_service_purchases_coach_id ON public.service_purchases(coach_id);
CREATE INDEX idx_service_purchases_coach_slug ON public.service_purchases(coach_slug);
CREATE INDEX idx_service_purchases_stripe_session ON public.service_purchases(stripe_session_id);
CREATE INDEX idx_service_purchases_status ON public.service_purchases(payment_status);
CREATE INDEX idx_service_purchases_created_at ON public.service_purchases(created_at);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_purchases_updated_at
  BEFORE UPDATE ON public.service_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_service_purchases_updated_at();
