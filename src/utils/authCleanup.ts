
/**
 * Utility to clean up all Supabase auth-related localStorage items
 * This helps prevent authentication "limbo" states
 */
export const cleanupAuthState = () => {
  console.log("========== AUTH CLEANUP START ==========");
  console.log("Starting auth cleanup process");
  console.log("Pre-cleanup localStorage state:", Object.keys(localStorage));
  
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
    const cookieName = c.split('=')[0].trim();
    if (cookieName.startsWith('sb-') || cookieName.startsWith('supabase.auth.')) {
      console.log(`Removing cookie: ${cookieName}`);
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
  
  console.log("Post-cleanup localStorage state:", Object.keys(localStorage));
  console.log("========== AUTH CLEANUP COMPLETE ==========");
};

/**
 * Checks if there are any Supabase auth keys still present
 * This helps detect if cleanup failed
 */
export const checkForAuthRemnants = () => {
  const authKeys = [];
  
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      authKeys.push(key);
    }
  });
  
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      authKeys.push(`sessionStorage: ${key}`);
    }
  });
  
  if (authKeys.length > 0) {
    console.warn("⚠️ AUTH REMNANTS DETECTED:", authKeys);
    return true;
  }
  
  return false;
};

