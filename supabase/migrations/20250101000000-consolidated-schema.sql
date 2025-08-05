-- Consolidated Schema Migration
-- This migration combines all the essential table structures and changes
-- from the previous migrations to create a clean, current schema

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Create guest_reports table (core table)
CREATE TABLE IF NOT EXISTS public.guest_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  report_type TEXT NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  report_content TEXT,
  has_report BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Additional columns from later migrations
  translator_log_id UUID,
  report_log_id UUID,
  has_translator_log BOOLEAN NOT NULL DEFAULT false,
  has_report_log BOOLEAN NOT NULL DEFAULT false,
  modal_ready BOOLEAN NOT NULL DEFAULT false,
  is_ai_report BOOLEAN DEFAULT false
);

-- Create report_logs table
CREATE TABLE IF NOT EXISTS public.report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT,
  user_id TEXT, -- Can be auth user UUID or guest report UUID
  report_type TEXT,
  endpoint TEXT,
  report_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  duration_ms INTEGER,
  client_id UUID,
  engine_used TEXT,
  metadata JSONB DEFAULT '{}',
  is_guest BOOLEAN DEFAULT false,
  has_error BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create translator_logs table
CREATE TABLE IF NOT EXISTS public.translator_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Can be auth user UUID or guest report UUID
  swiss_data JSONB NOT NULL DEFAULT '{}',
  geocoding_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_ready_signals table
CREATE TABLE IF NOT EXISTS public.report_ready_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_report_id TEXT NOT NULL,
  is_ai_report BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create temp_report_data table
CREATE TABLE IF NOT EXISTS public.temp_report_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_report_id TEXT NOT NULL,
  plain_token TEXT NOT NULL,
  chat_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_list table
CREATE TABLE IF NOT EXISTS public.price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_identifier TEXT UNIQUE NOT NULL,
  unit_price_usd NUMERIC(10,2) NOT NULL,
  is_ai BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Guest reports indexes
CREATE INDEX IF NOT EXISTS idx_guest_reports_stripe_session_id ON public.guest_reports(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_guest_reports_email ON public.guest_reports(email);
CREATE INDEX IF NOT EXISTS idx_guest_reports_has_report ON public.guest_reports(has_report);
CREATE INDEX IF NOT EXISTS idx_guest_reports_created_at ON public.guest_reports(created_at DESC);

-- Report logs indexes
CREATE INDEX IF NOT EXISTS idx_report_logs_user_id ON public.report_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_logs_created_at ON public.report_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_logs_status ON public.report_logs(status);

-- Translator logs indexes
CREATE INDEX IF NOT EXISTS idx_translator_logs_user_id ON public.translator_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_translator_logs_created_at ON public.translator_logs(created_at DESC);

-- Report ready signals indexes
CREATE INDEX IF NOT EXISTS idx_report_ready_signals_guest_report_id ON public.report_ready_signals(guest_report_id);
CREATE INDEX IF NOT EXISTS idx_report_ready_signals_created_at ON public.report_ready_signals(created_at DESC);

-- Temp report data indexes
CREATE INDEX IF NOT EXISTS idx_temp_report_data_guest_report_id ON public.temp_report_data(guest_report_id);
CREATE INDEX IF NOT EXISTS idx_temp_report_data_expires_at ON public.temp_report_data(expires_at);

-- Promo codes indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);

-- Price list indexes
CREATE INDEX IF NOT EXISTS idx_price_list_identifier ON public.price_list(price_identifier);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Update guest_reports updated_at trigger
CREATE OR REPLACE FUNCTION public.update_guest_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_reports_updated_at
BEFORE UPDATE ON public.guest_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_guest_reports_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on guest_reports
ALTER TABLE public.guest_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all guest reports
CREATE POLICY "service_role_manage_guest_reports" 
  ON public.guest_reports 
  USING (true);

-- ============================================================================
-- REPLICA IDENTITY (for realtime)
-- ============================================================================

-- Set replica identity for realtime functionality
ALTER TABLE guest_reports REPLICA IDENTITY FULL; 