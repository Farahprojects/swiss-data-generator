/**
 * Utility for cleaning up authentication state to prevent limbo states
 */
export const cleanupAuthState = async () => {
  console.log('🧹 Cleaning up auth state...');
  
  // Clear chat stores first (downstream from auth)
  try {
    // Clear message store using dynamic import (works in browser)
    const { triggerMessageStoreSelfClean } = await import('@/stores/messageStore');
    await triggerMessageStoreSelfClean();
    
    // Clear chat store using dynamic import (works in browser)
    const { useChatStore } = await import('@/core/store');
    useChatStore.getState().clearAllData();
  } catch (error) {
    console.warn('Could not clear chat stores during auth cleanup:', error);
  }
  
  // Clear all Supabase auth keys from localStorage (comprehensive patterns)
  console.log('🧹 Clearing localStorage...');
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase') || 
        key.includes('sb-') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('user')) {
      console.log('Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Clear from sessionStorage if present (comprehensive patterns)
  console.log('🧹 Clearing sessionStorage...');
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase') || 
        key.includes('sb-') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('user')) {
      console.log('Removing sessionStorage key:', key);
      sessionStorage.removeItem(key);
    }
  });

  // Clear IndexedDB if present (for Supabase offline storage)
  console.log('🧹 Clearing IndexedDB...');
  try {
    if ('indexedDB' in window) {
      const dbNames = ['supabase', 'supabase-auth-token'];
      dbNames.forEach(dbName => {
        indexedDB.deleteDatabase(dbName).catch(err => {
          console.log('IndexedDB cleanup (expected if not exists):', err.message);
        });
      });
    }
  } catch (error) {
    console.log('IndexedDB cleanup failed (expected):', error);
  }

  // Clear any cookies that might contain auth data
  console.log('🧹 Clearing auth cookies...');
  if (typeof document !== 'undefined') {
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      if (name.includes('supabase') || 
          name.includes('sb-') || 
          name.includes('auth') ||
          name.includes('session') ||
          name.includes('token')) {
        console.log('Clearing cookie:', name);
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      }
    });
  }
  
  console.log('✅ Comprehensive auth state cleanup completed');
};

/**
 * Emergency cleanup for when user data is deleted but session still exists
 */
export const emergencyAuthCleanup = async () => {
  console.log('🚨 Emergency auth cleanup...');
  await cleanupAuthState();
  
  // Force a hard reload to clear any remaining state
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};