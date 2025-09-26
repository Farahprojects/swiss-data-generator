/**
 * Mobile-only authentication utilities
 * Uses Capacitor plugins - only for mobile builds
 */

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export interface MobileAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Check if running in Capacitor environment
 */
export const isCapacitorApp = (): boolean => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * Sign in with Google (mobile)
 */
export const signInWithGoogle = async (): Promise<MobileAuthResult> => {
  if (!isCapacitorApp()) {
    return { success: false, error: 'Not running in Capacitor app' };
  }

  try {
    // Preserve current location to restore after login
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('postAuthReturnPath', currentPath);

    const redirectTo = 'therai://auth/callback';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return { success: false, error: error.message };
    }

    const url = (data as any)?.url as string | undefined;
    if (!url) {
      return { success: false, error: 'Failed to get OAuth URL' };
    }

    // Open the URL in the in-app browser
    await Browser.open({ url, presentationStyle: 'fullscreen' });
    return { success: true };
  } catch (err) {
    console.error('Google OAuth exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
};

/**
 * Sign in with Apple (mobile)
 */
export const signInWithApple = async (): Promise<MobileAuthResult> => {
  if (!isCapacitorApp()) {
    return { success: false, error: 'Not running in Capacitor app' };
  }

  try {
    // Preserve current location to restore after login
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('postAuthReturnPath', currentPath);

    const redirectTo = 'therai://auth/callback';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          response_mode: 'form_post',
        },
      },
    });

    if (error) {
      console.error('Apple OAuth error:', error);
      return { success: false, error: error.message };
    }

    const url = (data as any)?.url as string | undefined;
    if (!url) {
      return { success: false, error: 'Failed to get OAuth URL' };
    }

    // Open the URL in the in-app browser
    await Browser.open({ url, presentationStyle: 'fullscreen' });
    return { success: true };
  } catch (err) {
    console.error('Apple OAuth exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
};
