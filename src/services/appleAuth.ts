/**
 * Apple Authentication Service using apple-signin
 * Works in both web and mobile (Capacitor) environments
 */

import { supabase } from '@/integrations/supabase/client';

export interface AppleAuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

/**
 * Handle Apple Sign-In using Apple's JavaScript SDK
 * This works natively in both web and mobile environments
 */
export const handleAppleAuth = async (): Promise<AppleAuthResult> => {
  try {
    // Load Apple Sign-In script
    await loadAppleScript();
    
    // Initialize Apple Sign-In
    const AppleID = (window as any).AppleID;
    if (!AppleID) {
      return { success: false, error: 'Apple Sign-In SDK not loaded' };
    }

    // Get Apple Client ID from environment
    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    if (!clientId) {
      return { success: false, error: 'Apple Client ID not configured' };
    }

    // Configure Apple Sign-In
    AppleID.auth.init({
      clientId: clientId,
      scope: 'name email',
      redirectURI: window.location.origin + '/therai',
      usePopup: true,
    });

    // Initiate Apple Sign-In
    const data = await AppleID.auth.signIn();
    
    if (data && data.authorization) {
      // Exchange Apple credential for Supabase session
      const { data: supabaseData, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: data.authorization.id_token,
      });

      if (error) {
        console.error('Supabase Apple auth error:', error);
        return { success: false, error: error.message };
      }

      console.log('Apple authentication successful:', supabaseData);
      return { success: true, user: supabaseData.user };
    }

    return { success: false, error: 'Apple authentication failed' };
  } catch (error) {
    console.error('Apple auth error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Apple authentication failed' 
    };
  }
};

/**
 * Load Apple Sign-In script dynamically
 */
const loadAppleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if ((window as any).AppleID) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Apple Sign-In SDK'));
    
    document.head.appendChild(script);
  });
};

/**
 * Sign out from Apple
 */
export const handleAppleSignOut = async (): Promise<void> => {
  try {
    // Apple Sign-In doesn't have a specific sign-out method
    // The session is managed by Supabase
    console.log('Apple sign out handled by Supabase');
  } catch (error) {
    console.error('Apple sign out error:', error);
  }
};
