// WebSocket authentication service
// Gets ephemeral tokens for secure WebSocket connections

import { supabase } from '@/integrations/supabase/client';

export interface WSAuthToken {
  token: string;
  expires_at: string;
}

export class WSAuthService {
  private static tokenCache: WSAuthToken | null = null;
  private static tokenPromise: Promise<WSAuthToken> | null = null;

  /**
   * Get an ephemeral token for WebSocket authentication
   * Uses cached token if still valid, otherwise fetches new one
   */
  static async getWSToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && new Date(this.tokenCache.expires_at) > new Date()) {
      return this.tokenCache.token;
    }

    // If we're already fetching a token, wait for it
    if (this.tokenPromise) {
      const token = await this.tokenPromise;
      return token.token;
    }

    // Fetch new token
    this.tokenPromise = this.fetchWSToken();
    try {
      const token = await this.tokenPromise;
      this.tokenCache = token;
      return token.token;
    } finally {
      this.tokenPromise = null;
    }
  }

  private static async fetchWSToken(): Promise<WSAuthToken> {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No authenticated session');
      }

      // Call edge function to get ephemeral token
      const { data, error } = await supabase.functions.invoke('get-ws-token', {
        body: { chat_id: 'conversation' }
      });

      if (error) {
        throw new Error(`Failed to get WS token: ${error.message}`);
      }

      return data as WSAuthToken;
    } catch (error) {
      console.error('[WSAuthService] Failed to get WS token:', error);
      // Fallback: use session access token directly
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          token: session.access_token,
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
        };
      }
      throw error;
    }
  }

  /**
   * Clear cached token (call when user logs out)
   */
  static clearToken(): void {
    this.tokenCache = null;
    this.tokenPromise = null;
  }
}
