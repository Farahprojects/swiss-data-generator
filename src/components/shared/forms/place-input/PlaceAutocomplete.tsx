
import { useState, useEffect, forwardRef } from 'react';
import { useGoogleMapsScript } from './hooks/useGoogleMapsScript';
import { PlaceData } from './utils/extractPlaceData';
import { Label } from '@/components/ui/label';
import { AutocompleteContainer } from './components/AutocompleteContainer';
import { FallbackInput } from './components/FallbackInput';

export interface PlaceAutocompleteProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  error?: string;
}

export const PlaceAutocomplete = forwardRef<HTMLDivElement, PlaceAutocompleteProps>(
  ({ 
    label = "Location", 
    value = "", 
    onChange, 
    onPlaceSelect, 
    placeholder = "Enter a location", 
    required = false, 
    className = "", 
    id = "placeAutocomplete",
    disabled = false,
    error
  }, ref) => {
    const { isError, errorMessage } = useGoogleMapsScript();
    const [localValue, setLocalValue] = useState(value);
    const [showFallback, setShowFallback] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isClient, setIsClient] = useState(false);

    // Handle client-side hydration
    useEffect(() => {
      setIsClient(true);
    }, []);

    const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
    };

    const handleRetry = () => {
      setRetryCount(prev => prev + 1);
      setShowFallback(false);
      const container = document.getElementById(`${id}-container`);
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
      window.location.reload();
    };

    const handleLocalChange = (newValue: string) => {
      setLocalValue(newValue);
      onChange(newValue);
    };

    const handleShowFallback = () => {
      setShowFallback(true);
    };

    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value);
      }
    }, [value]);

    // Don't render on server side
    if (!isClient) {
      return null;
    }

    const shouldShowFallback = showFallback || isError || disabled;

    return (
      <div ref={ref} className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor={id} className="block">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {shouldShowFallback ? (
          <FallbackInput
            id={id}
            value={localValue}
            onChange={handleManualInput}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            isError={isError}
            errorMessage={errorMessage}
            onRetry={handleRetry}
          />
        ) : (
          <AutocompleteContainer
            id={id}
            value={localValue}
            onChange={handleLocalChange}
            onPlaceSelect={onPlaceSelect}
            placeholder={placeholder}
            disabled={disabled}
            onShowFallback={handleShowFallback}
            retryCount={retryCount}
          />
        )}
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

PlaceAutocomplete.displayName = 'PlaceAutocomplete';
