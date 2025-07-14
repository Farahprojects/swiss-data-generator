import { useState, useEffect, useCallback } from 'react';
import { googleMapsApiKeyManager } from '@/services/googleMapsApiKeyManager';
import { autocompleteMonitor } from '@/utils/autocompleteMonitoring';

interface UseGoogleMapsScriptResult {
  isLoaded: boolean;
  isError: boolean;
  apiKey: string | null;
  errorMessage?: string;
}

export const useGoogleMapsScript = (): UseGoogleMapsScriptResult => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [managerState, setManagerState] = useState(googleMapsApiKeyManager.getState());

  // Subscribe to manager state changes
  useEffect(() => {
    const unsubscribe = googleMapsApiKeyManager.subscribe(() => {
      setManagerState(googleMapsApiKeyManager.getState());
    });
    return () => unsubscribe();
  }, []);

  const loadGoogleWebComponents = useCallback(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof customElements === 'undefined') {
      return Promise.reject(new Error('Browser environment required for Google Web Components'));
    }

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
          autocompleteMonitor.log('load_success');
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
      return;
    }

    if (window.google?.maps) {
      console.log('✅ Google Maps script already loaded, loading web components...');
      try {
        await loadGoogleWebComponents();
        setIsLoaded(true);
      } catch (error) {
        console.error('❌ Error loading web components:', error);
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
        }
      };
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geocoding&callback=initGooglePlacesCallback&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('❌ Error loading Google Maps script');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('❌ Error in loadGoogleMapsScript:', error);
    }
  }, [loadGoogleWebComponents]);

  // Initialize API key fetching
  useEffect(() => {
    const loadMaps = async () => {
      // Only run in browser environment
      if (typeof window === 'undefined') return;
      
      if (!managerState.key && !managerState.isLoading && !managerState.error) {
        console.log('🔄 Initiating API key fetch via manager...');
        autocompleteMonitor.log('load_start');
        
        try {
          await googleMapsApiKeyManager.getApiKey();
        } catch (error) {
          console.error('❌ Failed to get API key:', error);
          autocompleteMonitor.log('load_error', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      } else if (managerState.key && !isLoaded) {
        console.log('🔄 Loading Google Maps script with cached key...');
        await loadGoogleMapsScript(managerState.key);
      }
    };
    
    loadMaps();
  }, [managerState, isLoaded, loadGoogleMapsScript]);

  return { 
    isLoaded, 
    isError: managerState.error !== null, 
    apiKey: managerState.key, 
    errorMessage: managerState.error || undefined 
  };
};