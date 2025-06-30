
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';
import { usePlaceSelection } from '../hooks/usePlaceSelection';
import { PlaceData } from '../utils/extractPlaceData';
import type { HTMLGmpPlaceAutocompleteElement } from '@/types/googleMaps';

interface AutocompleteContainerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  placeholder: string;
  disabled: boolean;
  onShowFallback: () => void;
  retryCount: number;
}

export const AutocompleteContainer: React.FC<AutocompleteContainerProps> = ({
  id,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled,
  onShowFallback,
  retryCount
}) => {
  const { isLoaded, isError } = useGoogleMapsScript();
  const autocompleteRef = useRef<HTMLGmpPlaceAutocompleteElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  const handlePlaceSelect = usePlaceSelection(onChange, onPlaceSelect);

  // Handle error state
  useEffect(() => {
    if (isError) {
      console.error('Google Maps failed to load, using fallback input');
      onShowFallback();
    }
  }, [isError, onShowFallback]);

  // Timeout fallback for loading state
  useEffect(() => {
    if (!isLoaded && !isError) {
      console.log('[DEBUG] Setting up timeout for Google Maps loading...');
      const timeout = setTimeout(() => {
        console.warn('Google Maps load timeout after 6 seconds. Showing fallback.');
        onShowFallback();
      }, 6000);

      return () => clearTimeout(timeout);
    }
  }, [isLoaded, isError, onShowFallback]);

  // Unified setup effect - single implementation for all devices
  useEffect(() => {
    console.log('[DEBUG] Setup effect triggered:', { 
      isLoaded, 
      google: !!window?.google, 
      disabled,
      windowExists: typeof window !== 'undefined'
    });

    // Early returns for invalid states
    if (!isLoaded || typeof window === 'undefined' || !window.google || disabled) {
      console.warn('[SKIP INIT]', { isLoaded, google: !!window?.google, disabled });
      return;
    }
    
    try {
      if (autocompleteRef.current) {
        autocompleteRef.current.value = value;
        return;
      }
      
      const container = containerRef.current;
      if (!container) {
        console.error('Container not found, falling back to manual input');
        onShowFallback();
        return;
      }

      // Clear container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Create unified autocomplete element
      const autocompleteElement = document.createElement('gmp-place-autocomplete') as HTMLGmpPlaceAutocompleteElement;
      autocompleteElement.id = `${id}-autocomplete`;
      autocompleteElement.setAttribute('placeholder', placeholder);
      autocompleteElement.value = value;
      
      // Unified styling - responsive by default
      autocompleteElement.style.width = '100%';
      autocompleteElement.style.height = '40px';
      autocompleteElement.style.fontSize = '16px';
      autocompleteElement.style.border = 'none';
      autocompleteElement.style.outline = 'none';
      autocompleteElement.style.background = 'transparent';
      
      container.appendChild(autocompleteElement);
      autocompleteRef.current = autocompleteElement;
      
      // Unified event handling
      autocompleteElement.addEventListener('gmp-select', async (event: Event) => {
        setIsProcessingSelection(true);
        await handlePlaceSelect(event);
        setIsProcessingSelection(false);
      });
      
      console.log('✅ Google Place Autocomplete element successfully created');
      
    } catch (error) {
      console.error('Error setting up place autocomplete:', error);
      onShowFallback();
    }
  }, [isLoaded, value, id, placeholder, onChange, onPlaceSelect, disabled, retryCount, handlePlaceSelect, onShowFallback]);

  // Sync value with autocomplete element
  useEffect(() => {
    if (autocompleteRef.current && value !== autocompleteRef.current.value) {
      autocompleteRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        id={`${id}-container`} 
        className="relative h-12 min-h-12 max-h-12 border rounded-md bg-background px-3 py-2"
        style={{
          fontSize: '16px',
          overflow: 'hidden'
        }}
      >
        {!isLoaded && !isError && (
          <div className="flex items-center gap-2 text-muted-foreground h-full">
            <Loader2 className="h-4 w-4 animate-spin" /> 
            Loading location services...
          </div>
        )}
      </div>
      
      {/* Processing overlay */}
      {isProcessingSelection && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};
