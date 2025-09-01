/**
 * Utility for cleaning up authentication state to prevent limbo states
 */
export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth state...');
  
  // Clear all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Clear from sessionStorage if present
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
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

export const aggressiveAuthCleanup = () => {
  // First, run the standard cleanup
  cleanupAuthState();
  
  // Clear ALL possible auth-related keys (overkill but safe)
  const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
  
  allKeys.forEach(key => {
    if (
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('user') ||
      key.toLowerCase().includes('session') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('login') ||
      key.toLowerCase().includes('sign') ||
      key.toLowerCase().includes('credential')
    ) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore errors for missing keys
      }
    }
  });
  
  // Force clear any remaining auth state
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear any cookies that might contain auth data
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    if (name.trim().toLowerCase().includes('auth') || 
        name.trim().toLowerCase().includes('supabase')) {
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
  });
};