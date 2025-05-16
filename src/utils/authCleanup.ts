
/**
 * Utility to clean up all Supabase auth-related localStorage items
 * This helps prevent authentication "limbo" states
 */
export const cleanupAuthState = () => {
  console.log("Starting auth cleanup process");
  
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log(`Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log(`Removing sessionStorage key: ${key}`);
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear any potential auth cookies (in case Supabase uses them in the future)
  document.cookie.split(';').forEach(c => {
    if (c.trim().startsWith('sb-') || c.trim().startsWith('supabase.auth.')) {
      const cookieName = c.split('=')[0].trim();
      console.log(`Removing cookie: ${cookieName}`);
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
  
  console.log("Auth cleanup completed");
};
