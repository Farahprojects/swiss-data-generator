
import { useState, useEffect, forwardRef } from 'react';
import { useGoogleMapsScript } from './hooks/useGoogleMapsScript';
import { PlaceData } from './utils/extractPlaceData';
import { Label } from '@/components/ui/label';
import { AutocompleteContainer } from './components/AutocompleteContainer';

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
    const [localValue, setLocalValue] = useState(value);
    const [isClient, setIsClient] = useState(false);

    // Handle client-side hydration
    useEffect(() => {
      setIsClient(true);
    }, []);

    const handleLocalChange = (newValue: string) => {
      setLocalValue(newValue);
      onChange(newValue);
    };

    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value);
      }
    }, [value]);

    // Don't render on server side
    if (!isClient) {
      return null;
    }

    return (
      <div ref={ref} className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor={id} className="block">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <AutocompleteContainer
          id={id}
          value={localValue}
          onChange={handleLocalChange}
          onPlaceSelect={onPlaceSelect}
          placeholder={placeholder}
          disabled={disabled}
        />
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

PlaceAutocomplete.displayName = 'PlaceAutocomplete';
