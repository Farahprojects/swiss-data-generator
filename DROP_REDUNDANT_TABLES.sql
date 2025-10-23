-- ============================================================================
-- DROP REDUNDANT TABLES - Swiss Data Generator Cleanup
-- Run this in your TheraiAstro Supabase SQL Editor
-- ============================================================================

-- Drop the view first (depends on api_keys)
DROP VIEW IF EXISTS v_api_key_balance;

-- Drop the tables
DROP TABLE IF EXISTS swissdebuglogs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;

-- Verify they're gone
SELECT 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('api_keys', 'swissdebuglogs', 'v_api_key_balance')
ORDER BY tablename;

-- Should return 0 rows

-- Confirm remaining tables
SELECT 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'price_list', 'geo_cache', 'translator_logs', 'stripe_webhook_events', 'payment_method')
ORDER BY tablename;

-- Should show your 6 core tables

