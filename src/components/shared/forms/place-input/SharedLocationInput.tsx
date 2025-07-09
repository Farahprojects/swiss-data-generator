
import React from 'react';
import { PlaceAutocomplete, PlaceAutocompleteProps } from './PlaceAutocomplete';

interface SharedLocationInputProps extends PlaceAutocompleteProps {
  // Add any additional shared props here if needed
}

export const SharedLocationInput: React.FC<SharedLocationInputProps> = (props) => {
  return <PlaceAutocomplete {...props} />;
};
