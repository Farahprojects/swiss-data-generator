
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

-- Update the record_api_usage function to handle schema changes and correct parameters
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
  
  -- Record usage
  INSERT INTO public.api_usage (
    user_id, 
    endpoint, 
    unit_price_usd, 
    total_cost_usd, 
    response_status, 
    processing_time_ms
  )
  VALUES (
    _user_id, 
    _endpoint, 
    _cost_usd, 
    _cost_usd, 
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

-- Create or replace trigger function to notify new logs
CREATE OR REPLACE FUNCTION public.notify_new_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use environment-based configuration for production
  PERFORM net.http_post(
    url := 'https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/api-usage-handler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0'
    ),
    body := jsonb_build_object('log_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

-- Check if the trigger already exists and drop it if it does
DROP TRIGGER IF EXISTS notify_new_log_trigger ON translator_logs;

-- Create the trigger to call the function after insert
CREATE TRIGGER notify_new_log_trigger
AFTER INSERT ON translator_logs
FOR EACH ROW
EXECUTE FUNCTION notify_new_log();

-- Note: System configuration should be set via environment variables in production
-- These settings are for reference only and should not contain hardcoded credentials

-- Update the check_balance_for_topup function to use a $100 top-up amount
CREATE OR REPLACE FUNCTION public.check_balance_for_topup()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If balance falls below $45, create a topup request
  IF NEW.balance_usd < 45 AND NEW.balance_usd >= 0 THEN
    -- Check if there's already a pending topup request for this user
    IF NOT EXISTS (
      SELECT 1 FROM public.topup_queue 
      WHERE user_id = NEW.user_id AND status = 'pending'
    ) THEN
      INSERT INTO public.topup_queue (user_id, amount_usd)
      VALUES (NEW.user_id, 100.00); -- Updated to $100 topup
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

