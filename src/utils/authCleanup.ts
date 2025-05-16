
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
  
  // Check for auth cookies as well
  document.cookie.split(';').forEach(c => {
    const cookieName = c.split('=')[0].trim();
    if (cookieName.startsWith('sb-') || cookieName.includes('supabase')) {
      authKeys.push(`cookie: ${cookieName}`);
    }
  });
  
  if (authKeys.length > 0) {
    console.warn("⚠️ AUTH REMNANTS DETECTED:", authKeys);
    return true;
  }
  
  return false;
};

/**
 * Detects phantom authentication states and cleans them up
 * Should be used on public pages to prevent redirect loops
 * @returns true if phantom auth was found and cleaned up
 */
export const detectAndCleanPhantomAuth = async (supabase: any): Promise<boolean> => {
  console.log("🔍 Checking for phantom authentication state");
  
  // Check for auth remnants
  const hasAuthRemnants = checkForAuthRemnants();
  
  if (hasAuthRemnants) {
    console.log("🔍 Auth remnants found, checking if session exists");
    
    try {
      // Try to get the current session from Supabase
      const { data } = await supabase.auth.getSession();
      const validSession = data?.session;
      
      // If we have auth remnants but no valid session, clean up
      if (!validSession) {
        console.log("🧹 Phantom auth detected! Auth remnants exist but no valid session found");
        cleanupAuthState();
        
        // For stubborn cookies/state, attempt a global sign out too
        try {
          await supabase.auth.signOut({ scope: 'global' });
          console.log("🧹 Performed global sign out for additional cleanup");
        } catch (error) {
          console.error("❌ Global sign out failed, but local cleanup was performed", error);
        }
        
        return true;
      } else {
        console.log("✅ Valid session exists, not a phantom auth situation");
      }
    } catch (error) {
      console.error("❌ Error checking session, cleaning up just in case", error);
      cleanupAuthState();
      return true;
    }
  } else {
    console.log("✅ No auth remnants found, clean state");
  }
  
  return false;
};

/**
 * Stronger reset that handles edge cases where normal cleanup fails
 * Uses multiple approaches to ensure clean state
 */
export const forceAuthReset = async (supabase: any): Promise<void> => {
  console.log("🔄 Performing forced auth reset");
  
  // First, clear all state and storage
  cleanupAuthState();
  
  // Then attempt a global sign out
  try {
    await supabase.auth.signOut({ scope: 'global' });
    console.log("🔄 Global sign out completed");
  } catch (error) {
    console.error("🔄 Global sign out failed:", error);
  }
  
  // Clear all cookies forcefully
  document.cookie.split(';').forEach(c => {
    const cookieName = c.split('=')[0].trim();
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log(`🔄 Cookie removed: ${cookieName}`);
  });
  
  console.log("🔄 Forced auth reset complete");
};
