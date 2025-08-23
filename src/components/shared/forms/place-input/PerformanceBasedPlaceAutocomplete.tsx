import React, { useState, useEffect, useRef } from 'react';
import { CleanPlaceAutocomplete } from './CleanPlaceAutocomplete';
import { PlaceData } from './utils/extractPlaceData';
import { supabase } from '@/integrations/supabase/client';

export interface PerformanceBasedPlaceAutocompleteProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  error?: string;
  onNameEntry?: (name: string) => void; // Callback when name is entered
}

export const PerformanceBasedPlaceAutocomplete = ({
  onNameEntry,
  ...props
}: PerformanceBasedPlaceAutocompleteProps) => {
  const [isAutocompleteEnabled, setIsAutocompleteEnabled] = useState(true);
  const [isPerformanceTested, setIsPerformanceTested] = useState(false);
  const [manualSuggestions, setManualSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [showManualSuggestions, setShowManualSuggestions] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const lastTypedValue = useRef<string>('');

  // Performance test function
  const testPerformance = async (): Promise<boolean> => {
    const startTime = performance.now();
    
    try {
      const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const response = await fetch(`${base}/google-places-autocomplete`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      
      const endTime = performance.now();
      const ttfb = endTime - startTime;
      
      console.log(`[PerformanceBasedPlaceAutocomplete] TTFB: ${ttfb}ms`);
      
      // If TTFB > 800ms, consider it slow
      return ttfb <= 800;
    } catch (error) {
      console.error('[PerformanceBasedPlaceAutocomplete] Performance test failed:', error);
      return false; // Treat as slow if test fails
    }
  };

  // Handle name entry and performance test
  const handleNameEntry = async (name: string) => {
    if (onNameEntry) {
      onNameEntry(name);
    }

    // Only test performance once per session
    if (!isPerformanceTested && name.length >= 2) {
      setIsPerformanceTested(true);
      const isFast = await testPerformance();
      
      if (!isFast) {
        console.log('[PerformanceBasedPlaceAutocomplete] Slow connection detected, disabling autocomplete');
        setIsAutocompleteEnabled(false);
      }
    }
  };

  // Manual search when autocomplete is disabled
  const handleManualSearch = async (query: string) => {
    if (!isAutocompleteEnabled && query.length >= 3) {
      setIsManualSearching(true);
      lastTypedValue.current = query;
      
      try {
        const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
          body: { query }
        });

        if (error) {
          console.error('Manual places search error:', error);
          setManualSuggestions([]);
          return;
        }

        // Handle the response structure
        let predictions: Array<{ place_id: string; description: string }> = [];
        
        if (Array.isArray(data)) {
          predictions = data;
        } else if (data && Array.isArray(data.predictions)) {
          predictions = data.predictions;
        } else if (data && typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            predictions = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('Error parsing string response:', parseError);
            predictions = [];
          }
        }

        // Return top 5 results
        setManualSuggestions(predictions.slice(0, 5));
        setShowManualSuggestions(predictions.length > 0);
      } catch (error) {
        console.error('Error in manual search:', error);
        setManualSuggestions([]);
      } finally {
        setIsManualSearching(false);
      }
    } else {
      setShowManualSuggestions(false);
      setManualSuggestions([]);
    }
  };

  // Handle manual suggestion selection
  const handleManualSuggestionSelect = async (prediction: { place_id: string; description: string }) => {
    setShowManualSuggestions(false);
    setManualSuggestions([]);
    
    // Update the input value
    props.onChange(prediction.description);
    
    if (props.onPlaceSelect) {
      try {
        // Get place details to fetch coordinates
        const { data: detailsData, error: detailsError } = await supabase.functions.invoke('google-place-details', {
          body: { placeId: prediction.place_id }
        });

        if (detailsError || !detailsData) {
          console.warn('Could not fetch place details, using basic data:', detailsError);
          const placeData: PlaceData = {
            name: prediction.description,
            placeId: prediction.place_id
          };
          props.onPlaceSelect(placeData);
          return;
        }

        const placeData: PlaceData = {
          name: detailsData.name || prediction.description,
          placeId: prediction.place_id,
          latitude: detailsData.latitude,
          longitude: detailsData.longitude,
          address: detailsData.formatted_address || prediction.description
        };
        
        props.onPlaceSelect(placeData);
      } catch (error) {
        console.error('Error fetching place details:', error);
        const placeData: PlaceData = {
          name: prediction.description,
          placeId: prediction.place_id
        };
        props.onPlaceSelect(placeData);
      }
    }
  };

  // Enhanced onChange handler
  const handleChange = (value: string) => {
    props.onChange(value);
    
    // Test performance on name entry
    if (!isPerformanceTested && value.length >= 2) {
      handleNameEntry(value);
    }
    
    // Handle manual search if autocomplete is disabled
    if (!isAutocompleteEnabled) {
      handleManualSearch(value);
    }
  };

  return (
    <div className="relative">
      <CleanPlaceAutocomplete
        {...props}
        onChange={handleChange}
        disabled={props.disabled || !isAutocompleteEnabled}
      />
      
      {/* Manual suggestions overlay */}
      {!isAutocompleteEnabled && showManualSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isManualSearching && (
            <div className="px-4 py-2 text-sm text-gray-500">
              Searching...
            </div>
          )}
          {manualSuggestions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-sm"
              onClick={() => handleManualSuggestionSelect(prediction)}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
      
      {/* Performance status indicator */}
      {!isAutocompleteEnabled && (
        <div className="mt-1 text-xs text-gray-500">
          Manual mode: Type 3+ characters to search
        </div>
      )}
    </div>
  );
};
