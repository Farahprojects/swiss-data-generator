// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with fallbacks for development

// Get environment variables
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use environment variables only - no fallbacks
export const SUPABASE_URL = SUPABASE_URL_ENV;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV;

// Validation helper
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

