
import { useState, useCallback } from 'react';

interface PlaceData {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  city: string;
  country: string;
}

export const usePlaceSelection = (initialValue: string = '') => {
  const [placeData, setPlaceData] = useState<PlaceData>({
    address: initialValue,
    coordinates: null,
    city: '',
    country: ''
  });

  const handlePlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    const coordinates = place.geometry?.location ? {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    } : null;

    // Extract city and country from address components
    let city = '';
    let country = '';
    
    if (place.address_components) {
      place.address_components.forEach(component => {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('country')) {
          country = component.long_name;
        }
      });
    }

    setPlaceData({
      address: place.formatted_address || '',
      coordinates,
      city,
      country
    });
  }, []);

  const updateAddress = useCallback((address: string) => {
    setPlaceData(prev => ({
      ...prev,
      address
    }));
  }, []);

  const resetPlace = useCallback(() => {
    setPlaceData({
      address: '',
      coordinates: null,
      city: '',
      country: ''
    });
  }, []);

  return {
    placeData,
    handlePlaceSelect,
    updateAddress,
    resetPlace
  };
};
