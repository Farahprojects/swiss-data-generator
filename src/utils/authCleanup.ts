/**
 * Comprehensive logout cleanup - fire and forget
 */
export const comprehensiveLogoutCleanup = async () => {
  console.log('🧹 Starting comprehensive logout cleanup...');
  
  try {
    // 1. Clear all stores first (downstream from auth)
    try {
      // Clear message store
      const { triggerMessageStoreSelfClean } = require('@/stores/messageStore');
      await triggerMessageStoreSelfClean();
      
      // Clear chat store
      const { useChatStore } = require('@/core/store');
      useChatStore.getState().clearAllData();
    } catch (error) {
      console.warn('Could not clear stores during logout:', error);
    }
    
    // 2. Clear ALL localStorage (nuclear option)
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
    
    // 3. Clear ALL sessionStorage (nuclear option)
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Could not clear sessionStorage:', error);
    }
    
    // 4. Clear any remaining auth tokens
    try {
      const { clearChatTokens } = require('@/services/auth/chatTokens');
      clearChatTokens();
    } catch (error) {
      console.warn('Could not clear chat tokens:', error);
    }
    
    console.log('✅ Comprehensive logout cleanup completed');
  } catch (error) {
    console.error('Error during logout cleanup:', error);
  }
};

/**
 * Utility for cleaning up authentication state to prevent limbo states
 */
export const cleanupAuthState = async () => {
  console.log('🧹 Cleaning up auth state...');
  
  // Clear chat stores first (downstream from auth)
  try {
    // Clear message store using the new trigger function
    const { triggerMessageStoreSelfClean } = require('@/stores/messageStore');
    await triggerMessageStoreSelfClean();
    
    // Clear chat store
    const { useChatStore } = require('@/core/store');
    useChatStore.getState().clearAllData();
  } catch (error) {
    console.warn('Could not clear chat stores during auth cleanup:', error);
  }
  
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
  // localStorage.removeItem('hasEmailChangeHistory'); // Removed - no longer needed
  
  console.log('✅ Auth state cleanup completed');
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