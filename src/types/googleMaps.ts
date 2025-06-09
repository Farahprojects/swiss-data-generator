
// Google Maps TypeScript definitions
declare global {
  interface Window {
    google?: any;
    initGooglePlacesCallback?: () => void;
    GOOGLE_MAPS_API_KEY?: string;
  }
}

export interface HTMLGmpPlaceAutocompleteElement extends HTMLElement {
  value: string;
  addEventListener(type: 'gmp-select', listener: (event: Event) => void): void;
}

export interface PlacePrediction {
  toPlace(): Promise<any>;
}

export interface PlaceSelectEvent extends Event {
  placePrediction: PlacePrediction;
}

export {};
