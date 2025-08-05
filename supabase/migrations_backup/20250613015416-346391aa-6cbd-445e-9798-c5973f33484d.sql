
-- Remove unique constraints on both product_id and price_id
ALTER TABLE stripe_products DROP CONSTRAINT IF EXISTS stripe_products_product_id_key;
ALTER TABLE stripe_products DROP CONSTRAINT IF EXISTS stripe_products_price_id_key;

-- Now update all report products with the real Stripe IDs
UPDATE stripe_products 
SET price_id = 'price_1RJ09fJ1YhE4Ljp0cVgsWMGG',
    product_id = 'prod_SDR1RASsRnBBFQ'
WHERE type = 'report' AND active = true;
