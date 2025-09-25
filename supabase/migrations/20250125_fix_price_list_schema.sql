-- Fix price_list table schema to use TEXT IDs instead of UUIDs
-- This allows us to use meaningful string IDs like 'subscription_onetime'

-- First, drop the existing table and recreate with correct schema
DROP TABLE IF EXISTS public.price_list CASCADE;

-- Recreate price_list table with TEXT ID
CREATE TABLE public.price_list (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  report_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price_usd NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  product_code TEXT,
  is_ai TEXT
);

-- Insert the pricing plans with string IDs
INSERT INTO price_list (
  id, 
  endpoint, 
  report_type, 
  name, 
  description, 
  unit_price_usd, 
  created_at, 
  product_code, 
  is_ai
) VALUES
-- Personal Plan (Thread-Limited)
('subscription_personal', 'subscription', 'subscription', 
 'Personal Growth Plan — Focus on Your Intentions', 
 'Ideal for individuals: create up to 10 intention threads per month, receive AI guidance and insights tailored to your journey.', 
 25.00, '2025-01-24 00:00:00+00', 'SUB_PERSONAL_MONTHLY', 'subscription'),

-- Professional Plan (Unlimited)
('subscription_professional', 'subscription', 'subscription', 
 'Professional Plan — Unlimited Coaching Power', 
 'Designed for coaches or power users: unlimited intention threads, full AI support, and advanced insights for multiple clients.', 
 75.00, '2025-01-24 00:00:00+00', 'SUB_PROFESSIONAL_MONTHLY', 'subscription'),

-- One-Time Purchase (Single Intention)
('subscription_onetime', 'subscription', 'subscription', 
 'Single-Intention Pass — Focused Journey', 
 'Perfect for trying the system with one intention thread: 2-month guided experience with AI insights. No subscription required.', 
 20.00, '2025-01-24 00:00:00+00', 'SUB_ONETIME_INTENTION', 'subscription');

-- Add RLS policies for the new table
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;

-- Allow service role to read all pricing data
CREATE POLICY "Allow service role to read pricing data" ON public.price_list
FOR SELECT TO service_role USING (true);

-- Allow authenticated users to read pricing data
CREATE POLICY "Allow authenticated users to read pricing data" ON public.price_list
FOR SELECT TO authenticated USING (true);


