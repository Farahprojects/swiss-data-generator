
export interface PlaceData {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export const extractPlaceData = (place: any): PlaceData => {
  const placeData: PlaceData = {
    name: '',
  };

  try {
    // Extract display name
    if (place.displayName) {
      placeData.name = place.displayName;
    } else if (place.formattedAddress) {
      placeData.name = place.formattedAddress;
    }

    // Extract formatted address
    if (place.formattedAddress) {
      placeData.address = place.formattedAddress;
    }

    // Extract coordinates
    if (place.location) {
      placeData.latitude = place.location.lat();
      placeData.longitude = place.location.lng();
    }

    // Extract place ID
    if (place.place_id) {
      placeData.placeId = place.place_id;
    }

    console.log('📊 Extracted place data:', placeData);
  } catch (error) {
    console.error('Error extracting place data:', error);
  }

  return placeData;
};
