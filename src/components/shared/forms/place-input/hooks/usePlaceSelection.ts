
import { useState, useCallback } from 'react';
import { PlaceData } from '../utils/extractPlaceData';
import { toast } from 'sonner';

interface UsePlaceSelectionProps {
  initialPlace?: string;
  onPlaceChange?: (place: string) => void;
}

interface UsePlaceSelectionResult {
  place: string;
  setPlace: (place: string) => void;
  placeData: PlaceData | null;
  isProcessingPlace: boolean;
  handlePlaceSelect: (placeData: PlaceData) => void;
}

export const usePlaceSelection = ({
  initialPlace = '',
  onPlaceChange
}: UsePlaceSelectionProps = {}): UsePlaceSelectionResult => {
  const [place, setPlace] = useState(initialPlace);
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);
  const [isProcessingPlace] = useState(false); // No async process now

  // Update local state and call parent onChange if provided
  const updatePlace = useCallback((newPlace: string) => {
    setPlace(newPlace);
    if (onPlaceChange) {
      onPlaceChange(newPlace);
    }
  }, [onPlaceChange]);
  
  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback((data: PlaceData) => {
    if (!data.name) {
      toast.error('Selected place is missing a name');
      return;
    }
    updatePlace(data.name);
    setPlaceData(data);
    // Optionally log, but no fallback
    if (data.latitude && data.longitude) {
      console.log(`📍 Coordinates: ${data.latitude}, ${data.longitude}`);
    } else {
      toast.error('Selected place has no coordinates (try being more specific)');
    }
  }, [updatePlace, toast]);

  return {
    place,
    setPlace: updatePlace,
    placeData,
    isProcessingPlace,
    handlePlaceSelect
  };
};
