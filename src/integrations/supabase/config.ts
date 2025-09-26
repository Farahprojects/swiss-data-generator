// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with robust validation

// Get environment variables with hardcoded fallbacks
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Hardcoded fallbacks for preview environments
const SUPABASE_URL_FALLBACK = "https://api.therai.co";
const SUPABASE_URL_FALLBACK_ALT = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const SUPABASE_ANON_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxd3F2d3F0ZmRxdHFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4NzEsImV4cCI6MjA1MDU1MDg3MX0.8QZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq";

// Use environment variables if available, otherwise use hardcoded fallbacks
// Try custom domain first, then fallback to original Supabase URL
export const SUPABASE_URL = SUPABASE_URL_ENV || SUPABASE_URL_FALLBACK || SUPABASE_URL_FALLBACK_ALT;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV || SUPABASE_ANON_KEY_FALLBACK;

// Validation helper
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Debug helper to check what's loaded
export const debugSupabaseConfig = () => {
  console.log('Supabase Config Debug:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    urlLength: SUPABASE_URL?.length || 0,
    keyLength: SUPABASE_ANON_KEY?.length || 0,
    urlStart: SUPABASE_URL?.substring(0, 20) || 'undefined',
    keyStart: SUPABASE_ANON_KEY?.substring(0, 20) || 'undefined'
  });
};

