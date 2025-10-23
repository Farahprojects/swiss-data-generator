-- Update subscription plans for Swiss Data Generator
-- Single $30/year plan for unlimited data generation

-- Clean up existing subscription plans
DELETE FROM price_list WHERE endpoint = 'subscription';

-- Insert the single $30/year plan
INSERT INTO price_list (id, endpoint, name, description, unit_price_usd, product_code, stripe_price_id)
VALUES (
  '30_yearly',
  'subscription',
  'Annual Access',
  'Unlimited Swiss data generation for one year',
  30.00,
  'swiss_annual',
  'price_REPLACE_WITH_YOUR_STRIPE_PRICE_ID'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit_price_usd = EXCLUDED.unit_price_usd,
  product_code = EXCLUDED.product_code,
  stripe_price_id = EXCLUDED.stripe_price_id;

-- Add comment
COMMENT ON TABLE price_list IS 'Product pricing catalog - Swiss Data Generator $30/year';


