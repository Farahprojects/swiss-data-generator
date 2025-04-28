
-- This SQL will need to be run to create the flow tracking table

CREATE TABLE IF NOT EXISTS public.stripe_flow_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  flow_state TEXT NOT NULL, -- 'checkout_created', 'payment_verified', 'account_created', 'account_linked'
  plan_type TEXT,
  add_ons JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_flow_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "service_role_manage_flow_tracking" 
  ON public.stripe_flow_tracking 
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_stripe_flow_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stripe_flow_tracking_updated_at
BEFORE UPDATE ON public.stripe_flow_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_stripe_flow_tracking_updated_at();

-- Add utilities to track flow

CREATE OR REPLACE FUNCTION public.get_flow_status(user_email TEXT)
RETURNS TABLE (session_id TEXT, flow_state TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY 
    SELECT 
      f.session_id, 
      f.flow_state, 
      f.created_at,
      f.updated_at
    FROM public.stripe_flow_tracking f
    WHERE f.email = user_email
    ORDER BY f.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
