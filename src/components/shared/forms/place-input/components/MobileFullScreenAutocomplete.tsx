import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlaceData } from '../utils/extractPlaceData';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileFullScreenAutocompleteProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  placeholder: string;
  label?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export const MobileFullScreenAutocomplete: React.FC<MobileFullScreenAutocompleteProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  label = "Location"
}) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search function
  const searchPlaces = async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
        body: { input, types: 'geocode' }
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
    } catch (error) {
      console.error('Error searching places:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
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
    setLocalValue(prediction.description);
    onChange(prediction.description);
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

    // Close the overlay
    onClose();
  };

  const handleClose = () => {
    // Clear any pending search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setPredictions([]);
    onClose();
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white z-[9999] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center px-4 py-4 border-b border-gray-200 bg-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="mr-3 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-medium text-gray-900 flex-1">
              {label}
            </h2>
          </div>

          {/* Search Input */}
          <div className="px-4 py-4 border-b border-gray-100 bg-white">
            <div className="relative">
              <Input
                ref={inputRef}
                value={localValue}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="h-12 text-base pl-4 pr-10 border-gray-300 focus:border-gray-500 rounded-lg"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {predictions.length > 0 ? (
              <div className="bg-white">
                {predictions.map((prediction, index) => (
                  <motion.div
                    key={prediction.place_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      className="w-full px-4 py-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors"
                      onClick={() => handlePlaceSelect(prediction)}
                    >
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 font-medium truncate">
                            {prediction.structured_formatting?.main_text || prediction.description.split(',')[0]}
                          </div>
                          <div className="text-gray-500 text-sm truncate">
                            {prediction.structured_formatting?.secondary_text || 
                             prediction.description.split(',').slice(1).join(',').trim()}
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : localValue.length >= 3 && !isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-base">No locations found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : localValue.length > 0 && localValue.length < 3 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-base">Keep typing...</p>
                <p className="text-sm mt-1">Enter at least 3 characters to search</p>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-base">Start typing to search locations</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};