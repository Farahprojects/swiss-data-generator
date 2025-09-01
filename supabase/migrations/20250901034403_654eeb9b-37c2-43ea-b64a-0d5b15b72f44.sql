-- Add subscription entry to price_list table
INSERT INTO public.price_list (
  id,
  name,
  description,
  unit_price_usd,
  endpoint,
  report_type,
  product_code,
  is_ai,
  created_at
) VALUES (
  'subscription1',
  'Premium Subscription',
  'Unlimited relationship chats and personalized AI insights',
  10.00,
  'subscription',
  'subscription',
  'SUB_PREMIUM_MONTHLY',
  'subscription',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit_price_usd = EXCLUDED.unit_price_usd,
  endpoint = EXCLUDED.endpoint,
  report_type = EXCLUDED.report_type,
  product_code = EXCLUDED.product_code,
  is_ai = EXCLUDED.is_ai;