
-- Insert public report products into stripe_products table
-- Note: Replace the placeholder product_id and price_id values with actual Stripe IDs

INSERT INTO public.stripe_products (
  product_id,
  price_id,
  name,
  description,
  amount_usd,
  currency,
  type,
  active
) VALUES
-- Premium Reports ($25)
(
  'prod_essence_report_placeholder',
  'price_essence_report_placeholder',
  'Essence Report',
  'A deep snapshot of who you are and what life''s asking from you right now.',
  25.00,
  'usd',
  'report',
  true
),
(
  'prod_sync_report_placeholder',
  'price_sync_report_placeholder',
  'Sync Report',
  'How your energy aligns with someone - connection, tension, and flow.',
  25.00,
  'usd',
  'report',
  true
),
-- Quick Reports ($3)
(
  'prod_mindset_report_placeholder',
  'price_mindset_report_placeholder',
  'Mindset Report',
  'Mood + mental clarity snapshot',
  3.00,
  'usd',
  'report',
  true
),
(
  'prod_flow_report_placeholder',
  'price_flow_report_placeholder',
  'Flow Report',
  'Creative/emotional openness over 7 days',
  3.00,
  'usd',
  'report',
  true
),
(
  'prod_focus_report_placeholder',
  'price_focus_report_placeholder',
  'Focus Report',
  'Best hours today for deep work or rest',
  3.00,
  'usd',
  'report',
  true
),
(
  'prod_monthly_report_placeholder',
  'price_monthly_report_placeholder',
  'Monthly Report',
  'Your personalized forecast for the current month',
  3.00,
  'usd',
  'report',
  true
);
