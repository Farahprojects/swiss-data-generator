/**
 * Utility for cleaning up authentication state to prevent limbo states
 */
export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth state...');
  
  // Clear all Supabase auth keys from localStorage (more aggressive patterns)
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')) {
      console.log('Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Clear from sessionStorage if present (more aggressive patterns)
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')) {
      console.log('Removing sessionStorage key:', key);
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear any other auth-related items
  localStorage.removeItem('hasEmailChangeHistory');
  
  console.log('✅ Auth state cleanup completed');
};

/**
 * Emergency cleanup for when user data is deleted but session still exists
 */
export const emergencyAuthCleanup = () => {
  console.log('🚨 Emergency auth cleanup...');
  cleanupAuthState();
  
  // Force a hard reload to clear any remaining state
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};