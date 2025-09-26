/**
 * Mobile app initialization utilities
 * Only imported in mobile builds
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

/**
 * Initialize mobile-specific features
 */
export const initializeMobileApp = async (): Promise<void> => {
  try {
    console.log('Initializing mobile app features...');
    
    // Set up deep link handling for OAuth callbacks
    await setupDeepLinkHandling();
    
    // Set up app state change handling
    await setupAppStateHandling();
    
    console.log('Mobile app initialization complete');
  } catch (error) {
    console.warn('Mobile app initialization failed:', error);
  }
};

/**
 * Set up deep link handling for OAuth callbacks
 */
const setupDeepLinkHandling = async (): Promise<void> => {
  try {
    const handleAppUrlOpen = async (data: any) => {
      const url = data?.url || '';
      if (url && url.startsWith('therai://auth/callback')) {
        // Handle OAuth callback
        await handleOAuthCallback(url);
      }
    };

    App.addListener('appUrlOpen', handleAppUrlOpen);
    console.log('Deep link handling set up');
  } catch (error) {
    console.warn('Failed to setup deep link handling:', error);
  }
};

/**
 * Set up app state change handling
 */
const setupAppStateHandling = async (): Promise<void> => {
  try {
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
      // Handle app state changes if needed
    });
    console.log('App state handling set up');
  } catch (error) {
    console.warn('Failed to setup app state handling:', error);
  }
};

/**
 * Handle OAuth callback from deep link
 */
const handleOAuthCallback = async (url: string): Promise<void> => {
  try {
    console.log('Handling OAuth callback:', url);
    
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    const error = parsed.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      await Browser.close();
      return;
    }

    if (code) {
      // Exchange code for session
      const { supabase } = await import('@/integrations/supabase/client');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('OAuth code exchange error:', exchangeError);
      } else {
        console.log('OAuth code exchanged successfully');
      }
    }

    // Close the browser and navigate
    await Browser.close();
    
    const returnPath = sessionStorage.getItem('postAuthReturnPath') || '/therai';
    sessionStorage.removeItem('postAuthReturnPath');
    window.location.replace(returnPath);
  } catch (e) {
    console.error('OAuth callback handling error:', e);
  }
};
