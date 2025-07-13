
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
}

export const AutocompleteContainer: React.FC<AutocompleteContainerProps> = ({
  id,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled
}) => {
  const { isLoaded, isError } = useGoogleMapsScript();
  const autocompleteRef = useRef<HTMLGmpPlaceAutocompleteElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  const handlePlaceSelect = usePlaceSelection(onChange, onPlaceSelect);

  // Setup Google Web Components autocomplete
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
        console.log('[DEBUG] Autocomplete element already exists, updating value');
        return;
      }
      
      const container = containerRef.current;
      if (!container) {
        console.error('Container not found');
        return;
      }

      // Clear container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Create autocomplete element
      const autocompleteElement = document.createElement('gmp-place-autocomplete') as HTMLGmpPlaceAutocompleteElement;
      autocompleteElement.id = `${id}-autocomplete`;
      autocompleteElement.setAttribute('placeholder', placeholder);
      autocompleteElement.value = value;
      
      // Unified responsive styling with iOS fixes and forced light mode
      autocompleteElement.style.width = '100%';
      autocompleteElement.style.height = '40px';
      autocompleteElement.style.fontSize = '16px';
      autocompleteElement.style.border = 'none';
      autocompleteElement.style.outline = 'none';
      autocompleteElement.style.background = 'white';
      autocompleteElement.style.backgroundColor = 'white';
      autocompleteElement.style.color = 'black';
      autocompleteElement.style.colorScheme = 'light';
      
      container.appendChild(autocompleteElement);
      autocompleteRef.current = autocompleteElement;
      
      // Event handling
      autocompleteElement.addEventListener('gmp-select', async (event: Event) => {
        setIsProcessingSelection(true);
        await handlePlaceSelect(event);
        setIsProcessingSelection(false);
      });
      
      console.log('✅ Google Place Autocomplete element successfully created');
      console.log('[DEBUG] Element dimensions:', {
        width: autocompleteElement.offsetWidth,
        height: autocompleteElement.offsetHeight,
        visible: autocompleteElement.offsetParent !== null
      });
      
    } catch (error) {
      console.error('Error setting up place autocomplete:', error);
    }
  }, [isLoaded, value, id, placeholder, disabled, handlePlaceSelect]);

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
        className="relative h-12 min-h-12 border rounded-md bg-background px-3 py-2"
        style={{
          fontSize: '16px',
          overflow: 'visible',
          position: 'relative',
          backgroundColor: 'transparent'
        }}
      >
        {!isLoaded && !isError && (
          <div className="flex items-center gap-2 text-muted-foreground h-full">
            <Loader2 className="h-4 w-4 animate-spin" /> 
            Loading location services...
          </div>
        )}
      </div>
      
      {/* Improved processing overlay - minimal interference */}
      {isProcessingSelection && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/90 rounded-full p-2 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        </div>
      )}
    </div>
  );
};
