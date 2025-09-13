// src/integrations/supabase/config.ts

// Centralized Supabase configuration with secure fallbacks
// SECURITY: Uses environment variables first, with safe fallbacks for development

// Environment variables (preferred)
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Safe fallbacks for development (these are public anon keys, not secrets)
// TODO: In production, ensure environment variables are properly set
const FALLBACK_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

// Use environment variables if available, otherwise use fallbacks
export const SUPABASE_URL = SUPABASE_URL_ENV || FALLBACK_URL;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV || FALLBACK_ANON_KEY;

// Log warning if using fallbacks (for security awareness) - hidden in production
if (!SUPABASE_URL_ENV || !SUPABASE_ANON_KEY_ENV) {
  // Only show in development
  if (import.meta.env.DEV) {
    console.warn('⚠️ Using fallback Supabase credentials. Set environment variables for production.');
  }
}

// Validation helper
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

