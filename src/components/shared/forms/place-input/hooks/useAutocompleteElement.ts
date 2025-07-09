
import { useCallback } from 'react';
import type { HTMLGmpPlaceAutocompleteElement } from '@/types/googleMaps';

// Simplified unified element creation - no mobile/desktop branching
export const useAutocompleteElement = () => {
  const createAutocompleteElement = useCallback((
    id: string,
    placeholder: string,
    value: string
  ): HTMLGmpPlaceAutocompleteElement | null => {
    if (!window.google) return null;
    
    const autocompleteElement = document.createElement('gmp-place-autocomplete') as HTMLGmpPlaceAutocompleteElement;
    autocompleteElement.id = `${id}-autocomplete`;
    autocompleteElement.setAttribute('placeholder', placeholder);
    autocompleteElement.value = value;
    
    // Unified responsive styling
    autocompleteElement.style.width = '100%';
    autocompleteElement.style.height = '40px';
    autocompleteElement.style.fontSize = '16px';
    autocompleteElement.style.border = 'none';
    autocompleteElement.style.outline = 'none';
    autocompleteElement.style.background = 'transparent';
    
    return autocompleteElement;
  }, []);

  return { createAutocompleteElement };
};
