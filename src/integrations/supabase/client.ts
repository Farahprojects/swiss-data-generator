import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Debug logging in development
if (import.meta.env.DEV) {
  console.log('Environment variables check:', {
    SUPABASE_URL: SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Missing',
    allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase environment variables:', {
    SUPABASE_URL: SUPABASE_URL || 'MISSING',
    SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY || 'MISSING',
    availableEnvVars: Object.keys(import.meta.env)
  });
  throw new Error('Missing required Supabase environment variables. Please check your .env file.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});