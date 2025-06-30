
import { useCallback } from 'react';
import { extractPlaceData, PlaceData } from '../utils/extractPlaceData';
import { toast } from 'sonner';

export const usePlaceSelection = (
  onChange: (value: string) => void,
  onPlaceSelect?: (placeData: PlaceData) => void
) => {
  return useCallback(async (event: Event) => {
    const customEvent = event as any;
    const prediction = customEvent.placePrediction;
    
    if (!prediction) {
      console.error('No place prediction found in event');
      return;
    }
    
    try {
      console.log('🔍 Place prediction selected:', prediction);
      
      const place = await prediction.toPlace();
      
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location']
      });
      
      console.log('🌍 Place details fetched:', place);
      
      const placeData = extractPlaceData(place);
      console.log('📊 Extracted place data:', placeData);
      
      onChange(placeData.name);
      
      if (onPlaceSelect) {
        onPlaceSelect(placeData);
      }
      
      if (placeData.latitude && placeData.longitude) {
        console.log(`📍 Coordinates: ${placeData.latitude}, ${placeData.longitude}`);
      } else {
        toast.error('Selected place has no coordinates (try being more specific)');
      }
    } catch (error) {
      console.error('Error processing place selection:', error);
      toast.error('Could not process place selection');
    }
  }, [onChange, onPlaceSelect]);
};
