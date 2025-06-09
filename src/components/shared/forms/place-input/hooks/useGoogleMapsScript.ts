
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
        setErrorMessage(`Supabase error: ${error.message}`);
        return;
      }
      
      console.log('📋 Function response:', data);
      
      if (!data?.apiKey) {
        console.error('❌ No API key returned from edge function');
        console.log('📋 Full response data:', data);
        setIsError(true);
        setErrorMessage('No API key in response');
        return;
      }
      
      console.log('✅ Successfully retrieved Google Maps API key');
      setApiKey(data.apiKey);
      
      if (window) {
        window.GOOGLE_MAPS_API_KEY = data.apiKey;
      }
    } catch (error) {
      console.error('❌ Error in fetchApiKey:', error);
      setIsError(true);
      setErrorMessage(`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const loadGoogleMapsScript = useCallback((key: string) => {
    if (window.google?.maps) {
      console.log('Google Maps script already loaded');
      setIsLoaded(true);
      return;
    }
    
    try {
      console.log('🔄 Loading Google Maps script...');
      
      window.initGooglePlacesCallback = () => {
        console.log('✅ Google Maps script loaded successfully');
        setIsLoaded(true);
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
  }, []);

  useEffect(() => {
    const loadMaps = async () => {
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
