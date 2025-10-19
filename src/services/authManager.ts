import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

type Platform = 'web' | 'ios' | 'android';
type OAuthProvider = 'google' | 'apple';

/**
 * Unified OAuth Manager - Single source of truth for authentication
 * Detects platform once at bootstrap, routes to correct OAuth flow
 */
class AuthManager {
  private static instance: AuthManager;
  private platform: Platform;
  private isListening = false;
  private readonly OAUTH_CALLBACK_URL = 'therai://auth/callback';

  private constructor() {
    // Detect platform once at initialization
    const cap = Capacitor.getPlatform();
    this.platform = cap === 'ios' ? 'ios' : cap === 'android' ? 'android' : 'web';
    
    console.log('[AuthManager] Initialized for platform:', this.platform);
    
    // Register platform-specific listeners
    if (this.isNativeApp()) {
      this.setupDeepLinkListener();
    }
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Returns true if running in native Capacitor app (iOS or Android)
   */
  isNativeApp(): boolean {
    return this.platform === 'ios' || this.platform === 'android';
  }

  /**
   * Sign in with OAuth provider
   * Routes to correct flow based on platform automatically
   */
  async signInWithOAuth(provider: OAuthProvider): Promise<{ error: Error | null }> {
    // Clean up any existing localStorage data before OAuth sign-in
    // This ensures no stale data from previous sessions
    try {
      const { cleanupAuthState } = await import('../utils/authCleanup');
      await cleanupAuthState();
      console.log('[AuthManager] Cleaned up existing auth state before OAuth');
    } catch (error) {
      console.warn('[AuthManager] Failed to cleanup auth state:', error);
    }

    if (this.isNativeApp()) {
      return await this.signInNative(provider);
    } else {
      return await this.signInWeb(provider);
    }
  }

  /**
   * Native app flow: In-app browser + deep link callback
   */
  private async signInNative(provider: OAuthProvider): Promise<{ error: Error | null }> {
    try {
      console.log(`[AuthManager] Native OAuth: ${provider}`);

      // IMPORTANT: We DON'T call supabase.auth.signInWithOAuth() here
      // because it automatically opens a browser (triggers system browser)
      // Instead, manually construct the OAuth URL
      
      const supabaseUrl = 'https://api.therai.co';
      const redirectUri = encodeURIComponent(this.OAUTH_CALLBACK_URL);
      
      let oauthUrl: string;
      if (provider === 'google') {
        oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectUri}&access_type=offline&prompt=consent`;
      } else {
        oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=apple&redirect_to=${redirectUri}&response_mode=form_post`;
      }

      console.log('[AuthManager] Opening in-app browser:', oauthUrl);

      // Open ONLY in-app browser (no automatic system browser)
      await Browser.open({
        url: oauthUrl,
        windowName: '_self',
        toolbarColor: '#ffffff',
        presentationStyle: 'fullscreen', // iOS: Hide URL bar for cleaner UI
      });

      return { error: null };
    } catch (err: unknown) {
      console.error('[AuthManager] Native OAuth error:', err);
      return { error: err instanceof Error ? err : new Error('OAuth failed') };
    }
  }

  /**
   * Web flow: Standard OAuth redirect
   */
  private async signInWeb(provider: OAuthProvider): Promise<{ error: Error | null }> {
    try {
      console.log(`[AuthManager] Web OAuth: ${provider}`);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${baseUrl}/therai`,
          queryParams: provider === 'google'
            ? { access_type: 'offline', prompt: 'consent' }
            : { response_mode: 'form_post' },
        },
      });

      if (error) {
        console.error('[AuthManager] Web OAuth error:', error);
        return { error: new Error(error.message || 'OAuth failed') };
      }

      return { error: null };
    } catch (err: unknown) {
      console.error('[AuthManager] Web OAuth error:', err);
      return { error: err instanceof Error ? err : new Error('OAuth failed') };
    }
  }

  /**
   * Set up deep link listener for native app OAuth callbacks
   * Only called if platform is iOS or Android
   */
  private setupDeepLinkListener() {
    if (this.isListening) return;

    console.log('[AuthManager] Setting up deep link listener');

    App.addListener('appUrlOpen', async (event) => {
      console.log('[AuthManager] Deep link received:', event.url);

      if (event.url.startsWith(this.OAUTH_CALLBACK_URL)) {
        try {
          // CRITICAL: Close in-app browser FIRST
          console.log('[AuthManager] Closing in-app browser...');
          await Browser.close();

          // Parse the callback URL
          const url = new URL(event.url);
          const hash = url.hash.substring(1);
          const searchParams = new URLSearchParams(url.search);
          const hashParams = new URLSearchParams(hash);

          console.log('[AuthManager] URL search params:', Object.fromEntries(searchParams));
          console.log('[AuthManager] URL hash params:', Object.fromEntries(hashParams));

          // Try to get tokens from either hash or search params
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          
          // Or handle OAuth code flow
          const code = searchParams.get('code');

          if (accessToken && refreshToken) {
            console.log('[AuthManager] Direct tokens received, setting session');

            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[AuthManager] Session error:', error);
            } else {
              console.log('[AuthManager] ✅ Authentication successful!');
            }
          } else if (code) {
            console.log('[AuthManager] OAuth code received, exchanging for session');
            
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('[AuthManager] Code exchange error:', error);
            } else {
              console.log('[AuthManager] ✅ Authentication successful!');
            }
          } else {
            console.error('[AuthManager] ❌ No tokens or code in callback URL');
            console.error('[AuthManager] Full URL:', event.url);
          }
        } catch (error) {
          console.error('[AuthManager] Callback handling error:', error);
        }
      }
    });

    this.isListening = true;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthManager] Sign out error:', error);
      throw error;
    }
    console.log('[AuthManager] Signed out successfully');
  }
}

// Lazy/safe singleton accessors (no eager initialization at import time)
let _authManager: AuthManager | null = null;
export function getAuthManager(): AuthManager {
  if (!_authManager) {
    _authManager = AuthManager.getInstance();
  }
  return _authManager;
}

// Explicit initializer to be called at app bootstrap (main.tsx)
export function initAuthManager(): void {
  getAuthManager();
}

// Export helper for components (centralized platform check)
export function useIsNativeApp(): boolean {
  return getAuthManager().isNativeApp();
}

