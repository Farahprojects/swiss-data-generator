/**
 * Web-only authentication utilities
 * No Capacitor imports - safe for web builds
 */

import { supabase } from '@/integrations/supabase/client';

export interface WebAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Sign in with Google (web)
 */
export const signInWithGoogle = async (): Promise<WebAuthResult> => {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/therai`,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Google OAuth exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
};

/**
 * Sign in with Apple (web)
 */
export const signInWithApple = async (): Promise<WebAuthResult> => {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${baseUrl}/therai`,
        queryParams: { response_mode: 'form_post' }
      }
    });

    if (error) {
      console.error('Apple OAuth error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Apple OAuth exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
};

/**
 * Check if running in web environment
 */
export const isWebEnvironment = (): boolean => {
  return typeof window !== 'undefined' && !window.Capacitor;
};
