// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with fallbacks for development

// Get environment variables
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fallback values for development - should be overridden by environment variables
const FALLBACK_URL = "https://your-project.supabase.co";
const FALLBACK_ANON_KEY = "your-anon-key-here";

// Use environment variables if available, otherwise use fallbacks
export const SUPABASE_URL = SUPABASE_URL_ENV || FALLBACK_URL;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV || FALLBACK_ANON_KEY;

// Validation helper
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

