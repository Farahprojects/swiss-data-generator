
import { SupabaseClient } from '@supabase/supabase-js';
import { log, logAuth } from './logUtils';

/**
 * Detects and cleans up phantom authentication states
 * that can occur when tokens remain in localStorage
 * but the actual session is invalid
 */
export const detectAndCleanPhantomAuth = async (supabase: SupabaseClient): Promise<boolean> => {
  try {
    // Check if we have supabase items in localStorage
    const hasSupabaseItems = Object.keys(localStorage).some(
      key => key.includes('supabase') || key.includes('sb-')
    );

    if (!hasSupabaseItems) {
      return false; // No cleanup needed
    }

    // Check if we have a valid session
    const { data } = await supabase.auth.getSession();
    const hasValidSession = !!data.session;

    // If we have supabase items but no valid session, clean up
    if (!hasValidSession) {
      logAuth("Found auth items without a valid session, cleaning up");
      await forceAuthReset(supabase);
      return true;
    }

    // Session exists and is valid
    return false;
  } catch (error) {
    log('error', "Error in phantom auth detection", error);
    return false;
  }
};

/**
 * Performs a thorough cleanup of all auth state
 * Use this when regular signOut doesn't work
 * or when auth state is inconsistent
 */
export const forceAuthReset = async (supabase: SupabaseClient): Promise<void> => {
  try {
    // Try a global signout first
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      log('warn', "Could not perform global signout, continuing with cleanup", e);
    }

    // Clean up localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Clean up sessionStorage
    Object.keys(sessionStorage || {}).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });

    logAuth("Auth state forcefully reset");
  } catch (error) {
    log('error', "Error during force auth reset", error);
  }
};

/**
 * Alias for forceAuthReset for backward compatibility
 * This is the function imported in AuthContext.tsx
 */
export const cleanupAuthState = forceAuthReset;

/**
 * Utility to check for any authentication remnants in storage
 * Returns count of auth-related items found
 */
export const checkForAuthRemnants = (): number => {
  try {
    // Find all supabase-related items
    const authItems = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('sb-')
    );
    
    return authItems.length;
  } catch (error) {
    log('error', "Error checking for auth remnants", error);
    return 0;
  }
};
