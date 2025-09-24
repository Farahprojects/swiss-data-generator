// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with fallbacks for development

// Get environment variables
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use actual Supabase project values
export const SUPABASE_URL = SUPABASE_URL_ENV || "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

// Validation helper
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

