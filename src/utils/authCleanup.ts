/**
 * Utility for cleaning up authentication state to prevent limbo states
 */
export const cleanupAuthState = () => {
  // Clear all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear from sessionStorage if present
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear any other auth-related items
  localStorage.removeItem('hasEmailChangeHistory');
};