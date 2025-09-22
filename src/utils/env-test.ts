// Environment variable test utility
// This file helps verify that VITE_ environment variables are properly loaded

export const testEnvironmentVariables = () => {
  console.log('🔍 Environment Variables Test:');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET');
  console.log('NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('MODE:', import.meta.env.MODE);
  
  // Check if we have the required variables
  const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  console.log('✅ Supabase URL configured:', hasSupabaseUrl);
  console.log('✅ Supabase Key configured:', hasSupabaseKey);
  
  return {
    hasSupabaseUrl,
    hasSupabaseKey,
    isConfigured: hasSupabaseUrl && hasSupabaseKey
  };
};

// Auto-run test in development
if (import.meta.env.DEV) {
  testEnvironmentVariables();
}
