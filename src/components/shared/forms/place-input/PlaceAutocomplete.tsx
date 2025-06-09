
import { useState, useEffect, useRef, forwardRef } from 'react';
import { useGoogleMapsScript } from './hooks/useGoogleMapsScript';
import { extractPlaceData, PlaceData } from './utils/extractPlaceData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HTMLGmpPlaceAutocompleteElement } from '@/types/googleMaps';

export interface PlaceAutocompleteProps {
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
}

export const PlaceAutocomplete = forwardRef<HTMLDivElement, PlaceAutocompleteProps>(
  ({ 
    label = "Location", 
    value = "", 
    onChange, 
    onPlaceSelect, 
    placeholder = "Enter a location", 
    required = false, 
    className = "", 
    id = "placeAutocomplete",
    disabled = false,
    error
  }, ref) => {
    const { isLoaded, isError } = useGoogleMapsScript();
    const autocompleteRef = useRef<HTMLGmpPlaceAutocompleteElement | null>(null);
    const [localValue, setLocalValue] = useState(value);
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
      if (!isLoaded || showFallback || !window.google) {
        return;
      }
      
      try {
        if (autocompleteRef.current) {
          autocompleteRef.current.value = localValue;
          return;
        }
        
        const autocompleteElement = document.createElement('gmp-place-autocomplete') as HTMLGmpPlaceAutocompleteElement;
        autocompleteElement.id = `${id}-autocomplete`;
        autocompleteElement.setAttribute('placeholder', placeholder);
        autocompleteElement.value = localValue;
        
        autocompleteElement.style.width = '100%';
        autocompleteElement.style.height = '40px';
        
        const container = document.getElementById(`${id}-container`);
        if (container) {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          container.appendChild(autocompleteElement);
          autocompleteRef.current = autocompleteElement;
          
          // Updated to use gmp-select event and proper conversion to Place
          autocompleteElement.addEventListener('gmp-select', async (event: Event) => {
            const customEvent = event as any;
            const prediction = customEvent.placePrediction;
            
            if (!prediction) {
              console.error('No place prediction found in event');
              return;
            }
            
            try {
              console.log('🔍 Place prediction selected:', prediction);
              
              // Convert prediction to actual Place object
              const place = await prediction.toPlace();
              
              // Fetch necessary fields including location (which contains coordinates)
              await place.fetchFields({
                fields: ['displayName', 'formattedAddress', 'location']
              });
              
              console.log('🌍 Place details fetched:', place);
              
              // Extract data using our utility
              const placeData = extractPlaceData(place);
              console.log('📊 Extracted place data:', placeData);
              
              setLocalValue(placeData.name);
              onChange(placeData.name);
              
              if (onPlaceSelect) {
                onPlaceSelect(placeData);
              }
              
              // Log coordinates if available
              if (placeData.latitude && placeData.longitude) {
                console.log(`📍 Coordinates: ${placeData.latitude}, ${placeData.longitude}`);
              } else {
                toast.error('Selected place has no coordinates (try being more specific)');
              }
            } catch (error) {
              console.error('Error processing place selection:', error);
              toast.error('Could not process place selection');
            }
          });
        } else {
          setShowFallback(true);
        }
      } catch (error) {
        console.error('Error setting up place autocomplete:', error);
        setShowFallback(true);
      }
    }, [isLoaded, localValue, id, placeholder, onChange, onPlaceSelect, showFallback]);

    useEffect(() => {
      if (isError) {
        setShowFallback(true);
      }
    }, [isError]);

    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value);
        if (autocompleteRef.current) {
          autocompleteRef.current.value = value;
        }
      }
    }, [value]);

    return (
      <div ref={ref} className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor={id} className="block">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {showFallback ? (
          <Input
            id={id}
            value={localValue}
            onChange={() => {}}
            placeholder="Location input not available"
            disabled={true}
            className="flex-1"
            required={required}
          />
        ) : (
          <div 
            id={`${id}-container`} 
            className="min-h-[40px] border rounded-md bg-background px-3 py-2"
          >
            {!isLoaded && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading places...</div>}
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

PlaceAutocomplete.displayName = 'PlaceAutocomplete';
