
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

  const loadGoogleMapsScript = useCallback((key: string) => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.error('❌ Not in browser environment');
      setIsError(true);
      setErrorMessage('Browser environment required');
      return;
    }

    if (window.google?.maps) {
      console.log('✅ Google Maps script already loaded');
      setIsLoaded(true);
      return;
    }
    
    try {
      console.log('🔄 Loading Google Maps script...');
      
      // Add CSP debugging
      console.log('🔍 Checking Content-Security-Policy headers...');
      
      window.initGooglePlacesCallback = () => {
        console.log('✅ Google Maps script loaded successfully');
        
        // Test network connectivity to places API
        console.log('🔍 Testing Places API connectivity...');
        
        setIsLoaded(true);
      };
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geocoding&callback=initGooglePlacesCallback&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onerror = (error) => {
        console.error('❌ Error loading Google Maps script:', error);
        setIsError(true);
        setErrorMessage('Failed to load Google Maps script');
      };
      
      console.log('🔄 Appending Google Maps script to document head...');
      document.head.appendChild(script);
    } catch (error) {
      console.error('❌ Error in loadGoogleMapsScript:', error);
      setIsError(true);
      setErrorMessage(`Script loading error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  useEffect(() => {
    const loadMaps = async () => {
      // Only run in browser environment
      if (typeof window === 'undefined') return;
      
      if (!apiKey) {
        await fetchApiKey();
      } else if (!isLoaded && !isError) {
        loadGoogleMapsScript(apiKey);
      }
    };
    
    loadMaps();
  }, [apiKey, isLoaded, isError, fetchApiKey, loadGoogleMapsScript]);

  return { isLoaded, isError, apiKey, errorMessage };
};
