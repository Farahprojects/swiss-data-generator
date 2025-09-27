import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://wrvqqvqvwqmfdqvqmaar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Custom URL scheme for OAuth callback
const OAUTH_CALLBACK_URL = 'therai://auth/callback';

export class CapacitorAuth {
  private static instance: CapacitorAuth;
  private isListening = false;

  private constructor() {}

  static getInstance(): CapacitorAuth {
    if (!CapacitorAuth.instance) {
      CapacitorAuth.instance = new CapacitorAuth();
    }
    return CapacitorAuth.instance;
  }

  async signInWithOAuth(provider: 'google' | 'apple') {
    try {
      // Set up URL listener if not already listening
      if (!this.isListening) {
        this.setupUrlListener();
      }

      // Open OAuth provider in browser
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
        console.error('OAuth error:', error);
        throw error;
      }

      if (data.url) {
        // Open the OAuth URL in the system browser
        await Browser.open({ url: data.url });
      }

      return { data, error: null };
    } catch (error) {
      console.error('OAuth sign-in error:', error);
      return { data: null, error };
    }
  }

  private setupUrlListener() {
    if (this.isListening) return;

    App.addListener('appUrlOpen', async (event) => {
      console.log('App opened with URL:', event.url);
      
      // Check if this is our OAuth callback
      if (event.url.startsWith(OAUTH_CALLBACK_URL)) {
        // Close the browser
        await Browser.close();
        
        // Extract the URL fragments
        const url = new URL(event.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
          } else {
            console.log('Successfully authenticated via OAuth');
          }
        }
      }
    });

    this.isListening = true;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
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
