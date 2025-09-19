import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('VITE_SUPABASE_PUBLISHABLE_KEY:', !!supabaseAnonKey);
  console.error('Please set these environment variables in your deployment.');
  
  // Create a mock client that will fail gracefully
  supabase = {
    functions: {
      invoke: async () => ({ 
        data: null, 
        error: { message: 'Supabase not configured - missing environment variables' } 
      })
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'apikey': supabaseAnonKey,
      },
    }
  });
}

export { supabase };
