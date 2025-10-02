// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Fail-fast approach: only use environment variables, no hardcoded fallbacks

// Get environment variables - fail if missing
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fail-fast validation - warn in dev, throw in prod
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const errorMessage = '[Supabase Config] Missing configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY';
  
  if (import.meta.env.MODE === 'development') {
    console.warn(errorMessage);
  } else {
    throw new Error(errorMessage);
  }
}

// Validation helper
export const isSupabaseConfigured = (): boolean =>
  !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Non-sensitive debug helper
export const debugSupabaseConfig = () => {
  console.log('[Supabase Config] Debug:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    urlLength: SUPABASE_URL?.length || 0,
    keyLength: SUPABASE_ANON_KEY?.length || 0,
    mode: import.meta.env.MODE,
  });
};