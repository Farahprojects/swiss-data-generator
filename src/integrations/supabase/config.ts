// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// SECURITY: No hardcoded credentials - uses environment variables only

// Get environment variables
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL_ENV) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
}

if (!SUPABASE_ANON_KEY_ENV) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_PUBLISHABLE_KEY');
}

// Export validated configuration
export const SUPABASE_URL = SUPABASE_URL_ENV;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV;

// Validation helper
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

