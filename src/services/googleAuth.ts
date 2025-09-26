/**
 * Google Authentication Service using @react-oauth/google
 * Works in both web and mobile (Capacitor) environments
 */

import { supabase } from '@/integrations/supabase/client';

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

/**
 * Handle Google Sign-In using Google Identity Services
 * This works natively in both web and mobile environments
 */
export const handleGoogleAuth = async (): Promise<GoogleAuthResult> => {
  try {
    // Load Google Identity Services script
    await loadGoogleScript();
    
    // Initialize Google Identity Services
    const google = (window as any).google;
    if (!google) {
      return { success: false, error: 'Google Identity Services not loaded' };
    }

    // Get Google Client ID from environment
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return { success: false, error: 'Google Client ID not configured' };
    }

    // Initialize Google Identity Services
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCallback,
    });

    // Prompt the user to sign in
    google.accounts.id.prompt();

    return { success: true };
  } catch (error) {
    console.error('Google auth error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Google authentication failed' 
    };
  }
};

/**
 * Load Google Identity Services script dynamically
 */
const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if ((window as any).google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    
    document.head.appendChild(script);
  });
};

/**
 * Handle Google authentication callback
 */
const handleGoogleCallback = async (response: any) => {
  try {
    console.log('Google auth response:', response);
    
    // Exchange Google credential for Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.credential,
    });

    if (error) {
      console.error('Supabase Google auth error:', error);
      return;
    }

    console.log('Google authentication successful:', data);
  } catch (error) {
    console.error('Google callback error:', error);
  }
};

/**
 * Sign out from Google
 */
export const handleGoogleSignOut = async (): Promise<void> => {
  try {
    const google = (window as any).google;
    if (google && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
  } catch (error) {
    console.error('Google sign out error:', error);
  }
};
