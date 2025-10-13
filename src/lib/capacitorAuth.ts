import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';

export class CapacitorAuth {
  private static instance: CapacitorAuth;

  private constructor() {
    const platform = Capacitor.getPlatform();
    console.log('[CapacitorAuth] Initializing on platform:', platform);
    
    // Only initialize native SDKs on native platforms
    if (platform === 'ios' || platform === 'android') {
      try {
        GoogleAuth.initialize({
          // Web Client ID - used for both iOS and Android
          clientId: '706959873059-ilu0j4usjtfuehp4h3l06snknbcnd2f4.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          // We only need an ID token for Supabase signInWithIdToken
          grantOfflineAccess: false,
        } as any); // Use 'as any' to bypass TypeScript issue with serverClientId
        console.log('[CapacitorAuth] GoogleAuth initialized successfully');
      } catch (error) {
        console.error('[CapacitorAuth] Failed to initialize GoogleAuth:', error);
      }
    } else {
      console.log('[CapacitorAuth] Skipping native SDK initialization on web platform');
    }
  }

  static getInstance(): CapacitorAuth {
    if (!CapacitorAuth.instance) {
      CapacitorAuth.instance = new CapacitorAuth();
    }
    return CapacitorAuth.instance;
  }

  async signInWithOAuth(provider: 'google' | 'apple', onSuccess?: () => void) {
    try {
      if (provider === 'google') {
        return await this.signInWithGoogleNative(onSuccess);
      } else if (provider === 'apple') {
        return await this.signInWithAppleNative(onSuccess);
      }
      throw new Error('Unsupported provider');
    } catch (error) {
      console.error('OAuth sign-in error:', error);
      return { data: null, error };
    }
  }

  private async signInWithGoogleNative(onSuccess?: () => void) {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      throw new Error('Native Google Sign-In is not available on web. Use Supabase OAuth instead.');
    }
    
    try {
      console.log('[CapacitorAuth] Starting Google native sign-in on', platform);
      
      // Sign in with Google native SDK
      const googleUser = await GoogleAuth.signIn();
      console.log('[CapacitorAuth] Google sign-in successful:', googleUser.email);

      // Get the ID token to authenticate with Supabase (plugin return shape can vary)
      const anyUser: any = googleUser as any;
      const idToken = anyUser?.authentication?.idToken || anyUser?.idToken;

      console.log('[CapacitorAuth] Google user object:', JSON.stringify(googleUser, null, 2));
      console.log('[CapacitorAuth] ID token present:', !!idToken);
      console.log('[CapacitorAuth] ID token length:', idToken?.length || 0);

      if (!idToken) {
        console.error('[CapacitorAuth] Full response:', googleUser);
        throw new Error('No ID token returned from Google. Check serverClientId configuration.');
      }

      // Sign in to Supabase with the Google ID token
      console.log('[CapacitorAuth] Calling Supabase signInWithIdToken...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('[CapacitorAuth] Supabase sign-in error:', error.message);
        console.error('[CapacitorAuth] Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Supabase auth failed: ${error.message}`);
      }

      console.log('[CapacitorAuth] Successfully authenticated with Supabase');
      onSuccess?.();
      
      return { data, error: null };
    } catch (error: any) {
      console.error('[CapacitorAuth] Google sign-in error:', error);
      return { data: null, error };
    }
  }

  private async signInWithAppleNative(onSuccess?: () => void) {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      throw new Error('Native Apple Sign-In is not available on web. Use Supabase OAuth instead.');
    }
    
    try {
      console.log('[CapacitorAuth] Starting Apple native sign-in on', platform);

      const options: SignInWithAppleOptions = {
        clientId: 'com.therai.app', // Your app bundle ID
        redirectURI: 'https://api.therai.co/auth/v1/callback', // Your Supabase callback URL
        scopes: 'email name',
        state: Math.random().toString(36).substring(2, 15),
        nonce: Math.random().toString(36).substring(2, 15),
      };

      const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);
      console.log('[CapacitorAuth] Apple sign-in successful');

      if (!result.response.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken,
        nonce: options.nonce,
      });

      if (error) {
        console.error('[CapacitorAuth] Supabase sign-in error:', error);
        throw error;
      }

      console.log('[CapacitorAuth] Successfully authenticated with Supabase');
      onSuccess?.();

      return { data, error: null };
    } catch (error: any) {
      console.error('[CapacitorAuth] Apple sign-in error:', error);
      return { data: null, error };
    }
  }

  async signOut() {
    try {
      // Sign out from Google if signed in
      if (Capacitor.getPlatform() !== 'web') {
        try {
          await GoogleAuth.signOut();
        } catch (err) {
          // Ignore if not signed in with Google
          console.log('[CapacitorAuth] Google sign out skipped');
        }
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
    } catch (error) {
      console.error('[CapacitorAuth] Sign out error:', error);
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
