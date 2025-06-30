
import { useCallback } from 'react';
import type { HTMLGmpPlaceAutocompleteElement } from '@/types/googleMaps';

export const useAutocompleteElement = () => {
  const createAutocompleteElement = useCallback((
    id: string,
    placeholder: string,
    value: string,
    isMobile: boolean,
    containerRef: React.RefObject<HTMLDivElement>
  ): HTMLGmpPlaceAutocompleteElement | null => {
    if (!containerRef.current || !window.google) return null;
    
    const autocompleteElement = document.createElement('gmp-place-autocomplete') as HTMLGmpPlaceAutocompleteElement;
    autocompleteElement.id = `${id}-autocomplete`;
    autocompleteElement.setAttribute('placeholder', placeholder);
    autocompleteElement.value = value;
    
    if (isMobile) {
      // Mobile-specific styling for portal
      autocompleteElement.style.width = containerRef.current.offsetWidth + 'px';
      autocompleteElement.style.height = '40px';
      autocompleteElement.style.fontSize = '16px';
      autocompleteElement.style.border = 'none';
      autocompleteElement.style.outline = 'none';
      autocompleteElement.style.background = 'transparent';
      autocompleteElement.style.position = 'absolute';
      autocompleteElement.style.top = '0';
      autocompleteElement.style.left = '0';
      autocompleteElement.style.zIndex = '9999';
    } else {
      // Standard desktop implementation
      autocompleteElement.style.width = '100%';
      autocompleteElement.style.height = '40px';
      autocompleteElement.style.fontSize = '16px';
      autocompleteElement.style.border = 'none';
      autocompleteElement.style.outline = 'none';
      autocompleteElement.style.background = 'transparent';
    }
    
    return autocompleteElement;
  }, []);

  const createMobileBackdrop = useCallback(() => {
    const backdrop = document.createElement('div');
    backdrop.style.position = 'absolute';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '48px';
    backdrop.style.background = 'white';
    backdrop.style.border = '1px solid hsl(var(--border))';
    backdrop.style.borderRadius = '6px';
    backdrop.style.zIndex = '1';
    return backdrop;
  }, []);

  return { createAutocompleteElement, createMobileBackdrop };
};
