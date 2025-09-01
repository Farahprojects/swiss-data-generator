// src/integrations/supabase/config.ts

// Centralized Supabase configuration with fallbacks
// This prevents black page issues in Lovable preview when env vars are undefined

// Default values for Lovable preview environment
const DEFAULT_SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

// Use environment variables if available, otherwise use defaults
// This ensures the app works in both Lovable preview and production
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Validation helper (non-throwing)
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Log configuration status (for debugging)
if (typeof window !== 'undefined') {
  console.log('[Supabase Config] URL:', SUPABASE_URL ? 'configured' : 'missing');
  console.log('[Supabase Config] Anon Key:', SUPABASE_ANON_KEY ? 'configured' : 'missing');
  console.log('[Supabase Config] Using fallbacks:', !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}