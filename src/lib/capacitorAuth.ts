import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Custom URL scheme for OAuth callback
const OAUTH_CALLBACK_URL = 'therai://auth/callback';

export class CapacitorAuth {
  private static instance: CapacitorAuth;
  private isListening = false;

  private constructor() {
    this.setupUrlListener();
  }

  static getInstance(): CapacitorAuth {
    if (!CapacitorAuth.instance) {
      CapacitorAuth.instance = new CapacitorAuth();
    }
    return CapacitorAuth.instance;
  }

  async signInWithOAuth(provider: 'google' | 'apple', onSuccess?: () => void) {
    try {
      console.log(`[CapacitorAuth] Starting ${provider} OAuth with in-app browser`);

      // Get OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: OAUTH_CALLBACK_URL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[CapacitorAuth] OAuth URL generation error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }

      console.log('[CapacitorAuth] Opening OAuth URL in in-app browser');

      // Open OAuth URL in in-app browser (stays within app)
      await Browser.open({
        url: data.url,
        windowName: '_self',
        toolbarColor: '#ffffff',
      });

      // The deep link listener will handle the callback
      return { data, error: null };
    } catch (error) {
      console.error('[CapacitorAuth] OAuth sign-in error:', error);
      return { data: null, error };
    }
  }

  private setupUrlListener() {
    if (this.isListening) return;

    App.addListener('appUrlOpen', async (event) => {
      console.log('[CapacitorAuth] App URL opened:', event.url);

      // Check if this is our OAuth callback
      if (event.url.startsWith(OAUTH_CALLBACK_URL)) {
        try {
          // Close the in-app browser
          await Browser.close();

          // Parse the URL to extract tokens
          const url = new URL(event.url);
          
          // Supabase sends tokens as URL fragments (#access_token=...)
          // or as query params (?access_token=...)
          const hash = url.hash.substring(1); // Remove the '#'
          const params = new URLSearchParams(hash || url.search);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('[CapacitorAuth] Tokens received, setting session');

            // Set the session in Supabase
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[CapacitorAuth] Error setting session:', error);
            } else {
              console.log('[CapacitorAuth] Successfully authenticated!');
            }
          } else {
            console.error('[CapacitorAuth] No tokens found in callback URL');
          }
        } catch (error) {
          console.error('[CapacitorAuth] Error handling callback:', error);
        }
      }
    });

    this.isListening = true;
    console.log('[CapacitorAuth] Deep link listener set up');
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[CapacitorAuth] Sign out error:', error);
      throw error;
    }
    console.log('[CapacitorAuth] Signed out successfully');
  }

  getCurrentUser() {
    return supabase.auth.getUser();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const capacitorAuth = CapacitorAuth.getInstance();
