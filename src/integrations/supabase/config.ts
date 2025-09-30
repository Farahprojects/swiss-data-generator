// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with hardcoded fallbacks

// Get environment variables with fallbacks
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://api.therai.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

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