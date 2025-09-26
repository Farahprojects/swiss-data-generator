/**
 * Mobile OAuth Service for Capacitor Apps
 * Handles OAuth flows using In-App Browser instead of popups
 */

import { supabase } from '@/integrations/supabase/client';

interface MobileOAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Check if running in Capacitor mobile app
 */
export const isCapacitorApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const capacitor = (window as any).Capacitor;
  if (!capacitor) return false;
  
  // Check if we're in a native platform
  if (typeof capacitor.isNativePlatform === 'function') {
    return capacitor.isNativePlatform();
  }
  
  // Fallback check
  if (typeof capacitor.getPlatform === 'function') {
    return capacitor.getPlatform() !== 'web';
  }
  
  return false;
};

/**
 * Get OAuth URL for mobile (without automatic redirect)
 */
const getOAuthUrl = async (provider: 'google' | 'apple', redirectTo: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Get URL only, don't redirect
        queryParams: provider === 'google' 
          ? { access_type: 'offline', prompt: 'consent' }
          : { response_mode: 'form_post' }
      }
    });

    if (error) {
      console.error(`${provider} OAuth error:`, error);
      return null;
    }

    return (data as any)?.url || null;
  } catch (err) {
    console.error(`${provider} OAuth exception:`, err);
    return null;
  }
};

/**
 * Handle OAuth flow in mobile app using In-App Browser
 */
export const handleMobileOAuth = async (provider: 'google' | 'apple'): Promise<MobileOAuthResult> => {
  if (!isCapacitorApp()) {
    return { success: false, error: 'Not running in Capacitor app' };
  }

  try {
    // Dynamically import Capacitor Browser plugin with error handling
    const BrowserModule = await import(/* @vite-ignore */ '@capacitor/browser').catch(() => null);
    if (!BrowserModule) {
      return { success: false, error: 'Capacitor Browser module not available' };
    }
    
    const { Browser } = BrowserModule;
    
    // Get OAuth URL
    const redirectTo = 'therai://auth/callback';
    const oauthUrl = await getOAuthUrl(provider, redirectTo);
    
    if (!oauthUrl) {
      return { success: false, error: `Failed to get ${provider} OAuth URL` };
    }

    // Store current path for return after auth
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('postAuthReturnPath', currentPath);
    }

    // Open OAuth URL in In-App Browser
    await Browser.open({ 
      url: oauthUrl, 
      presentationStyle: 'fullscreen',
      windowName: '_self'
    });

    return { success: true };
  } catch (error) {
    console.error('Mobile OAuth error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Handle OAuth callback from deep link
 */
export const handleOAuthCallback = async (url: string): Promise<void> => {
  try {
    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get('code');
    const error = parsedUrl.searchParams.get('error');

    if (error) {
      console.error('OAuth error (mobile callback):', error);
      return;
    }

    if (code) {
      // Exchange code for session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('OAuth code exchange error (mobile):', exchangeError);
        return;
      }

      console.log('OAuth successful (mobile)');
    }

    // Close the In-App Browser
    try {
      const BrowserModule = await import(/* @vite-ignore */ '@capacitor/browser').catch(() => null);
      if (BrowserModule) {
        const { Browser } = BrowserModule;
        await Browser.close();
      }
    } catch (e) {
      console.warn('Failed to close browser:', e);
    }

    // Navigate to return path or default
    const returnPath = sessionStorage.getItem('postAuthReturnPath') || '/therai';
    sessionStorage.removeItem('postAuthReturnPath');
    
    if (typeof window !== 'undefined') {
      window.location.replace(returnPath);
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
  }
};
