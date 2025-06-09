
import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter location...",
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) {
      return;
    }

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['(cities)'],
        fields: ['formatted_address', 'geometry', 'name', 'address_components']
      }
    );

    // Handle place selection
    const handlePlaceSelect = () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && place.formatted_address) {
        onChange(place.formatted_address);
        onPlaceSelect(place);
      }
    };

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect);

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange, onPlaceSelect]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
};
