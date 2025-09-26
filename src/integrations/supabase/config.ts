// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with robust validation

// Get environment variables
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Immediate validation with clear error messages
if (!SUPABASE_URL_ENV) {
  throw new Error(
    'VITE_SUPABASE_URL environment variable is required but not found. ' +
    'Please check your .env file and build configuration.'
  );
}

if (!SUPABASE_ANON_KEY_ENV) {
  throw new Error(
    'VITE_SUPABASE_PUBLISHABLE_KEY environment variable is required but not found. ' +
    'Please check your .env file and build configuration.'
  );
}

// Export validated environment variables
export const SUPABASE_URL = SUPABASE_URL_ENV;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_ENV;

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

