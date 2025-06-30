
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';
import { usePlaceSelection } from '../hooks/usePlaceSelection';
import { useLayoutStabilization } from '../hooks/useLayoutStabilization';
import { useAutocompleteElement } from '../hooks/useAutocompleteElement';
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
  // All hooks MUST be called unconditionally at the top level
  const { isLoaded, isError } = useGoogleMapsScript();
  const autocompleteRef = useRef<HTMLGmpPlaceAutocompleteElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handlePlaceSelect = usePlaceSelection(onChange, onPlaceSelect);
  const stabilizeLayout = useLayoutStabilization(isMobile);
  const { createAutocompleteElement, createMobileBackdrop } = useAutocompleteElement();

  // Detect mobile environment
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle error state
  useEffect(() => {
    if (isError) {
      console.error('Google Maps failed to load, using fallback input');
      onShowFallback();
    }
  }, [isError, onShowFallback]);

  // Main setup effect
  useEffect(() => {
    // Early returns for invalid states
    if (!isLoaded || !window.google || disabled) {
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

      const autocompleteElement = createAutocompleteElement(
        id,
        placeholder,
        value,
        isMobile,
        containerRef
      );

      if (!autocompleteElement) return;

      if (isMobile) {
        const backdrop = createMobileBackdrop();
        container.appendChild(backdrop);
      }
      
      container.appendChild(autocompleteElement);
      autocompleteRef.current = autocompleteElement;
      
      // Enhanced event handling with proper cleanup
      autocompleteElement.addEventListener('gmp-select', async (event: Event) => {
        // Prevent any scroll during processing
        if (isMobile) {
          event.preventDefault();
          event.stopPropagation();
          setIsProcessingSelection(true);
        }
        
        await handlePlaceSelect(event);
        
        // Enhanced stabilization for mobile
        if (isMobile) {
          stabilizeLayout(containerRef);
          setIsProcessingSelection(false);
        }
      });
      
    } catch (error) {
      console.error('Error setting up place autocomplete:', error);
      onShowFallback();
    }
  }, [isLoaded, value, id, placeholder, onChange, onPlaceSelect, disabled, retryCount, isMobile, handlePlaceSelect, stabilizeLayout, createAutocompleteElement, createMobileBackdrop, onShowFallback]);

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
        className={`relative h-12 min-h-12 max-h-12 border rounded-md bg-background px-3 py-2 ${
          isMobile ? 'mobile-autocomplete-isolated' : 'mobile-autocomplete-container'
        }`}
        style={{
          isolation: 'isolate',
          contain: isMobile ? 'layout style size' : 'layout style',
          fontSize: '16px',
          overflow: 'hidden'
        }}
      >
        {!isLoaded && (
          <div className="flex items-center gap-2 text-muted-foreground h-full">
            <Loader2 className="h-4 w-4 animate-spin" /> 
            Loading location services...
          </div>
        )}
      </div>
      
      {/* Processing overlay for mobile */}
      {isProcessingSelection && isMobile && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};
