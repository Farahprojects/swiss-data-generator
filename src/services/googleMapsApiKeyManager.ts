import { supabase } from "@/integrations/supabase/client";

interface ApiKeyState {
  key: string | null;
  isLoading: boolean;
  error: string | null;
  promise: Promise<string> | null;
}

class GoogleMapsApiKeyManager {
  private state: ApiKeyState = {
    key: null,
    isLoading: false,
    error: null,
    promise: null
  };

  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach(callback => callback());
  }

  getState() {
    return { ...this.state };
  }

  async getApiKey(): Promise<string> {
    // If we already have the key, return it
    if (this.state.key) {
      return this.state.key;
    }

    // If there's already a request in progress, wait for it
    if (this.state.promise) {
      return this.state.promise;
    }

    // Start a new request
    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    this.state.promise = this.fetchApiKeyWithRetry();

    try {
      const key = await this.state.promise;
      this.state.key = key;
      this.state.isLoading = false;
      this.state.error = null;
      this.notify();
      return key;
    } catch (error) {
      this.state.isLoading = false;
      this.state.error = error instanceof Error ? error.message : 'Failed to fetch API key';
      this.state.promise = null;
      this.notify();
      throw error;
    }
  }

  private async fetchApiKeyWithRetry(maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔑 Fetching Google Maps API key (attempt ${attempt}/${maxRetries})`);
        
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        
        if (error) {
          throw new Error(`Supabase function error: ${error.message}`);
        }

        if (!data?.apiKey) {
          throw new Error('No API key returned from function');
        }

        console.log('✅ Google Maps API key fetched successfully');
        return data.apiKey;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`❌ API key fetch attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to fetch API key after retries');
  }

  // Reset state for testing or error recovery
  reset() {
    this.state = {
      key: null,
      isLoading: false,
      error: null,
      promise: null
    };
    this.notify();
  }
}

// Singleton instance
export const googleMapsApiKeyManager = new GoogleMapsApiKeyManager();