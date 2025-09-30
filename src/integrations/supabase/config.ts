// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Hardcoded values first, env as fallback

// Hardcoded values (primary)
const SUPABASE_URL_HARDCODED = "https://api.therai.co";
const SUPABASE_ANON_KEY_HARDCODED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3F0ZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

// Environment variables (fallback only)
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use hardcoded values first, env as fallback
export const SUPABASE_URL = SUPABASE_URL_HARDCODED || SUPABASE_URL_ENV;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_HARDCODED || SUPABASE_ANON_KEY_ENV;

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