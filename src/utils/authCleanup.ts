
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
      await gentleAuthCleanup(supabase);
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
 * Gentle cleanup that only removes obviously stale tokens
 * Used when session is definitely invalid
 */
export const gentleAuthCleanup = async (supabase: SupabaseClient): Promise<void> => {
  try {
    // Try a standard signout first
    try {
      await supabase.auth.signOut();
    } catch (e) {
      log('warn', "Could not perform standard signout, continuing with gentle cleanup", e);
    }

    // Only clean up clearly invalid tokens
    Object.keys(localStorage).forEach(key => {
      // Only remove expired or malformed tokens, not all auth data
      if (key.includes('supabase.auth.token') || key.includes('sb-auth-token')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            // Check if token is expired
            if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // If we can't parse it, it's probably corrupted
          localStorage.removeItem(key);
        }
      }
    });

    logAuth("Gentle auth cleanup completed");
  } catch (error) {
    log('error', "Error during gentle auth cleanup", error);
  }
};

/**
 * Performs a thorough cleanup of all auth state
 * Use this ONLY on explicit logout
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
 * Updated cleanup function that doesn't aggressively clear on every operation
 * Only use on explicit logout
 */
export const cleanupAuthState = (supabase: SupabaseClient): void => {
  // Only do gentle cleanup, not forced reset
  gentleAuthCleanup(supabase).catch(error => {
    console.error("Failed to clean up auth state:", error);
  });
};

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
