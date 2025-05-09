

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

-- Fixed version of the record_api_usage function with the correct column names
CREATE OR REPLACE FUNCTION public.record_api_usage(_user_id uuid, _endpoint text, _cost_usd numeric, _request_params jsonb DEFAULT NULL::jsonb, _response_status integer DEFAULT NULL::integer, _processing_time_ms integer DEFAULT NULL::integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _usage_id UUID;
  _current_balance NUMERIC(10,2);
  _new_balance NUMERIC(10,2);
BEGIN
  -- Get current balance WITH LOCK to prevent race conditions
  SELECT balance_usd INTO _current_balance
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE; -- This locks the row until transaction completes
  
  -- Create if not exists with 0 balance
  IF _current_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance_usd)
    VALUES (_user_id, 0)
    RETURNING balance_usd INTO _current_balance;
  END IF;
  
  -- Check if user has enough credits
  IF _current_balance < _cost_usd THEN
    RAISE EXCEPTION 'Insufficient credits: % < %', _current_balance, _cost_usd;
  END IF;
  
  -- Calculate new balance
  _new_balance := _current_balance - _cost_usd;
  
  -- Record usage - using the correct column names (unit_price_usd and total_cost_usd)
  INSERT INTO public.api_usage (
    user_id, 
    endpoint, 
    unit_price_usd, 
    total_cost_usd, 
    request_params, 
    response_status, 
    processing_time_ms
  )
  VALUES (
    _user_id, 
    _endpoint, 
    _cost_usd, 
    _cost_usd, 
    _request_params, 
    _response_status, 
    _processing_time_ms
  )
  RETURNING id INTO _usage_id;
  
  -- Deduct credits
  UPDATE public.user_credits
  SET balance_usd = _new_balance,
      last_updated = now()
  WHERE user_id = _user_id;
  
  -- Double-check for negative balance after debit (extra safety)
  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'Negative balance after debit: %', _new_balance;
  END IF;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, type, amount_usd, description, api_call_type, reference_id)
  VALUES (_user_id, 'debit', _cost_usd, 'API usage: ' || _endpoint, _endpoint, _usage_id);
  
  RETURN _usage_id;
END;
$$;
