
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGoogleMapsScriptResult {
  isLoaded: boolean;
  isError: boolean;
  apiKey: string | null;
  errorMessage?: string;
}

export const useGoogleMapsScript = (): UseGoogleMapsScriptResult => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchApiKey = useCallback(async () => {
    try {
      console.log('🔍 Fetching Google Maps API key from edge function...');
      
      const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
        method: 'GET',
      });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        setIsError(true);
        setErrorMessage(`Function error: ${error.message}`);
        return;
      }
      
      console.log('📋 Function response:', data);
      
      if (!data?.apiKey) {
        console.error('❌ No API key returned from edge function');
        setIsError(true);
        setErrorMessage('No API key in response');
        return;
      }
      
      console.log('✅ Successfully retrieved Google Maps API key');
      setApiKey(data.apiKey);
      
      // Store globally for reference
      if (typeof window !== 'undefined') {
        window.GOOGLE_MAPS_API_KEY = data.apiKey;
      }
    } catch (error) {
      console.error('❌ Error fetching API key:', error);
      setIsError(true);
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const loadGoogleWebComponents = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Check if web components are already loaded
      if (customElements.get('gmp-place-autocomplete')) {
        console.log('✅ Google Web Components already loaded');
        resolve();
        return;
      }

      console.log('🔄 Loading Google Web Components...');
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@googlemaps/web-components@0.8.0/dist/index.js';
      script.type = 'module';
      script.onload = () => {
        console.log('✅ Google Web Components script loaded');
        // Wait for the custom element to be defined
        customElements.whenDefined('gmp-place-autocomplete').then(() => {
          console.log('✅ gmp-place-autocomplete element ready');
          resolve();
        }).catch(reject);
      };
      script.onerror = () => {
        console.error('❌ Error loading Google Web Components script');
        reject(new Error('Failed to load Google Web Components'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  const loadGoogleMapsScript = useCallback(async (key: string) => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.error('❌ Not in browser environment');
      setIsError(true);
      setErrorMessage('Browser environment required');
      return;
    }

    if (window.google?.maps) {
      console.log('✅ Google Maps script already loaded, loading web components...');
      try {
        await loadGoogleWebComponents();
        setIsLoaded(true);
      } catch (error) {
        console.error('❌ Error loading web components:', error);
        setIsError(true);
        setErrorMessage('Failed to load Google Web Components');
      }
      return;
    }
    
    try {
      console.log('🔄 Loading Google Maps script...');
      
      window.initGooglePlacesCallback = async () => {
        console.log('✅ Google Maps script loaded successfully, loading web components...');
        try {
          await loadGoogleWebComponents();
          setIsLoaded(true);
        } catch (error) {
          console.error('❌ Error loading web components:', error);
          setIsError(true);
          setErrorMessage('Failed to load Google Web Components');
        }
      };
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geocoding&callback=initGooglePlacesCallback&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('❌ Error loading Google Maps script');
        setIsError(true);
        setErrorMessage('Failed to load Google Maps script');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('❌ Error in loadGoogleMapsScript:', error);
      setIsError(true);
      setErrorMessage(`Script loading error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadGoogleWebComponents]);

  useEffect(() => {
    const loadMaps = async () => {
      // Only run in browser environment
      if (typeof window === 'undefined') return;
      
      if (!apiKey) {
        await fetchApiKey();
      } else if (!isLoaded && !isError) {
        await loadGoogleMapsScript(apiKey);
      }
    };
    
    loadMaps();
  }, [apiKey, isLoaded, isError, fetchApiKey, loadGoogleMapsScript]);

  return { isLoaded, isError, apiKey, errorMessage };
};
