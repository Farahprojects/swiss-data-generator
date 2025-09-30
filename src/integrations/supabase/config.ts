// src/integrations/supabase/config.ts

// Centralized Supabase configuration
// Uses environment variables with hardcoded fallback for URL only

// Get environment variables
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://api.therai.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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