-- Swiss Data Generator Schema
-- Clean schema for Swiss astrology data generation app

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (user management)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    display_name TEXT,
    subscription_active BOOLEAN DEFAULT FALSE,
    subscription_plan TEXT,
    subscription_status TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create price_list table (subscription plans)
CREATE TABLE IF NOT EXISTS price_list (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    interval TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create geo_cache table (location caching)
CREATE TABLE IF NOT EXISTS geo_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    country TEXT,
    timezone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(location)
);

-- Create translator_logs table (Swiss engine usage tracking)
CREATE TABLE IF NOT EXISTS translator_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    request_data JSONB NOT NULL,
    response_data JSONB,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create stripe_webhook_events table (payment tracking)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create payment_method table (user payment methods)
CREATE TABLE IF NOT EXISTS payment_method (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create email_notification_templates table (email templates)
CREATE TABLE IF NOT EXISTS email_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_geo_cache_location ON geo_cache(location);
CREATE INDEX IF NOT EXISTS idx_translator_logs_user_id ON translator_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_translator_logs_created_at ON translator_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_user_id ON payment_method(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_notification_templates(template_type);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE translator_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for price_list (public read)
CREATE POLICY "Anyone can view price list" ON price_list FOR SELECT USING (true);

-- RLS Policies for geo_cache (public read/write)
CREATE POLICY "Anyone can view geo cache" ON geo_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can insert geo cache" ON geo_cache FOR INSERT WITH CHECK (true);

-- RLS Policies for translator_logs
CREATE POLICY "Users can view own logs" ON translator_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON translator_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stripe_webhook_events (service only)
CREATE POLICY "Service role can manage webhook events" ON stripe_webhook_events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for payment_method
CREATE POLICY "Users can view own payment methods" ON payment_method FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payment methods" ON payment_method FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for email_notification_templates (public read)
CREATE POLICY "Anyone can view email templates" ON email_notification_templates FOR SELECT USING (true);
CREATE POLICY "Service role can manage email templates" ON email_notification_templates FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert default subscription plan
INSERT INTO price_list (id, name, description, price_cents, currency, interval, active)
VALUES ('yearly_30', 'Swiss Data Generator', 'Unlimited Swiss astrology data generation', 3000, 'usd', 'year', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    currency = EXCLUDED.currency,
    interval = EXCLUDED.interval,
    active = EXCLUDED.active;

-- Insert default email templates
INSERT INTO email_notification_templates (template_type, subject, body_html, body_text)
VALUES 
    ('email_verification', 'Please verify your Swiss Data Generator account', 
     '<div>Please verify your email to complete registration.</div>', 
     'Please verify your email to complete registration.'),
    ('welcome_email', 'Welcome to Swiss Data Generator', 
     '<div>Welcome! Start generating Swiss astrology data.</div>', 
     'Welcome! Start generating Swiss astrology data.'),
    ('support_email', 'Your support request has been received', 
     '<div>We have received your support request.</div>', 
     'We have received your support request.')
ON CONFLICT (template_type) DO NOTHING;

-- Create trigger for updated_at on email_notification_templates
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();
