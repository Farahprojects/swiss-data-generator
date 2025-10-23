-- ============================================================================
-- TheraiAstro Database Setup for Swiss Data Generator
-- Essential tables only - stripped down from original Therai app
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE (User Management & Subscription)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    
    -- Subscription fields
    subscription_active BOOLEAN DEFAULT false,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_plan TEXT DEFAULT 'free',
    subscription_start_date TIMESTAMPTZ,
    subscription_next_charge TIMESTAMPTZ,
    
    -- Stripe fields
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    last_payment_status TEXT,
    last_invoice_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow service role to manage all profiles (for Stripe webhooks)
CREATE POLICY "Service role can manage all profiles"
    ON profiles FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- 2. PRICE_LIST TABLE (Subscription Plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_list (
    id TEXT PRIMARY KEY,
    endpoint TEXT,
    name TEXT NOT NULL,
    description TEXT,
    unit_price_usd NUMERIC(6,2) NOT NULL,
    product_code TEXT,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for price_list (public read)
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prices"
    ON price_list FOR SELECT
    USING (true);

-- Insert the $30/year plan
INSERT INTO price_list (id, endpoint, name, description, unit_price_usd, product_code, stripe_price_id)
VALUES (
    '30_yearly',
    'subscription',
    'Annual Access',
    'Unlimited Swiss data generation for one year',
    30.00,
    'swiss_annual',
    'YOUR_STRIPE_PRICE_ID_HERE'  -- Replace with actual Stripe price ID
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    unit_price_usd = EXCLUDED.unit_price_usd,
    stripe_price_id = EXCLUDED.stripe_price_id;


-- ============================================================================
-- 3. GEO_CACHE TABLE (Location Geocoding Cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS geo_cache (
    place TEXT PRIMARY KEY,
    lat NUMERIC(9,6) NOT NULL,
    lon NUMERIC(9,6) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_geo_cache_updated ON geo_cache(updated_at);

-- RLS for geo_cache (public read, service role write)
ALTER TABLE geo_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read geo_cache"
    ON geo_cache FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage geo_cache"
    ON geo_cache FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- 4. TRANSLATOR_LOGS TABLE (Translation Activity Logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS translator_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type TEXT,
    request_payload JSONB,
    translator_payload JSONB,
    response_status INTEGER,
    swiss_data JSONB,
    processing_time_ms INTEGER,
    error_message TEXT,
    google_geo BOOLEAN DEFAULT false,
    swiss_error BOOLEAN DEFAULT false,
    chat_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying logs
CREATE INDEX IF NOT EXISTS idx_translator_logs_created ON translator_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_translator_logs_request_type ON translator_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_translator_logs_swiss_error ON translator_logs(swiss_error);

-- RLS for translator_logs
ALTER TABLE translator_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage translator_logs"
    ON translator_logs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- 5. API_KEYS TABLE (OPTIONAL - Not needed for basic app)
-- ============================================================================
-- Removed - Swiss function not used in simplified app
-- Users authenticate through Supabase auth, not API keys


-- ============================================================================
-- 6. SWISSDEBUGLOGS TABLE (REMOVED - Swiss function not used)
-- ============================================================================
-- Removed - App uses translator-edge directly, not swiss gateway


-- ============================================================================
-- 7. STRIPE_WEBHOOK_EVENTS TABLE (Stripe Event Audit Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    stripe_event_type TEXT NOT NULL,
    stripe_kind TEXT,
    stripe_customer_id TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_customer ON stripe_webhook_events(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed, created_at);

-- RLS
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events"
    ON stripe_webhook_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- 8. PAYMENT_METHOD TABLE (Optional - for payment method tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_method (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT,
    card_brand TEXT,
    card_last4 TEXT,
    active BOOLEAN DEFAULT true,
    next_billing_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payment_method_user ON payment_method(user_id);

-- RLS
ALTER TABLE payment_method ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods"
    ON payment_method FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment methods"
    ON payment_method FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- 9. DATABASE VIEW: v_api_key_balance (REMOVED - Not needed)
-- ============================================================================
-- Removed - No API key system in simplified app


-- ============================================================================
-- 10. TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- SUMMARY OF TABLES
-- ============================================================================
-- Core Tables (5 total):
-- 1. profiles - User accounts with subscription status
-- 2. price_list - Subscription pricing ($30/year plan)
-- 3. geo_cache - Geocoding cache for translator-edge
-- 4. translator_logs - Translator function activity logs
-- 5. stripe_webhook_events - Stripe webhook audit trail
-- 6. payment_method - Payment method tracking (optional)

-- IMPORTANT: 
-- - Replace 'YOUR_STRIPE_PRICE_ID_HERE' with your actual Stripe price ID
-- - Configure Stripe webhooks to point to your webhook handler function
-- - Set up proper Supabase auth in your app

