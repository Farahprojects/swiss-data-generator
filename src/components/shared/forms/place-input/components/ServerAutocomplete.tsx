import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlaceData } from '../utils/extractPlaceData';

interface ServerAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  placeholder: string;
  disabled: boolean;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export const ServerAutocomplete: React.FC<ServerAutocompleteProps> = ({
  id,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled,
  className = ''
}) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const searchPlaces = async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
        body: { input, types: 'geocode' }
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Error searching places:', error);
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce timer
    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handlePlaceSelect = async (prediction: Prediction) => {
    onChange(prediction.description);
    setIsOpen(false);
    setPredictions([]);

    if (onPlaceSelect) {
      try {
        const { data, error } = await supabase.functions.invoke('google-place-details', {
          body: { 
            placeId: prediction.place_id,
            fields: 'geometry,formatted_address,name'
          }
        });

        if (error) throw error;

        const result = data.result;
        if (result && result.geometry) {
          const placeData: PlaceData = {
            name: result.formatted_address || prediction.description,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            placeId: prediction.place_id
          };
          onPlaceSelect(placeData);
        }
      } catch (error) {
        console.error('Error getting place details:', error);
        // Fallback to basic data
        const placeData: PlaceData = {
          name: prediction.description,
          placeId: prediction.place_id
        };
        onPlaceSelect(placeData);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handlePlaceSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ backgroundColor: 'white', zIndex: 9999 }}
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                index === highlightedIndex ? 'bg-muted' : ''
              }`}
              onClick={() => handlePlaceSelect(prediction)}
            >
              <div className="text-sm">
                <div className="font-medium">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                {prediction.structured_formatting?.secondary_text && (
                  <div className="text-muted-foreground text-xs">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};