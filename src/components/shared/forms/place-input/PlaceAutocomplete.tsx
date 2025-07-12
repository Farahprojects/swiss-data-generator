
import { useState, useEffect, forwardRef } from 'react';
import { useGoogleMapsScript } from './hooks/useGoogleMapsScript';
import { useMobileAutocomplete } from '@/hooks/useMobileAutocomplete';
import { autocompleteMonitor } from '@/utils/autocompleteMonitoring';
import { PlaceData } from './utils/extractPlaceData';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AutocompleteContainer } from './components/AutocompleteContainer';
import { FallbackInput } from './components/FallbackInput';
import { ServerAutocomplete } from './components/ServerAutocomplete';
import { MobileFullScreenAutocomplete } from './components/MobileFullScreenAutocomplete';

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
    const { isMobile, shouldUseFallback } = useMobileAutocomplete();
    const [localValue, setLocalValue] = useState(value);
    const [showFallback, setShowFallback] = useState(false);
    const [useServerAutocomplete, setUseServerAutocomplete] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [forceAutocomplete, setForceAutocomplete] = useState(false);
    const [hasTriedWebComponents, setHasTriedWebComponents] = useState(false);
    const [showMobileOverlay, setShowMobileOverlay] = useState(false);

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
      // Switch to server-based autocomplete only when actually needed
      setUseServerAutocomplete(true);
      setHasTriedWebComponents(true);
      autocompleteMonitor.log('fallback_used', { 
        error: 'Web Components failed, using server autocomplete'
      });
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

    // Check if we should use mobile full-screen on mobile devices
    const shouldUseMobileOverlay = isMobile && !disabled && !isError;
    
    // Simplified fallback logic - only use server autocomplete when explicitly needed
    const shouldShowFallback = (showFallback || disabled) && !forceAutocomplete;
    const shouldUseServerAutocomplete = useServerAutocomplete || (isError && !forceAutocomplete);

    return (
      <div ref={ref} className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor={id} className="block">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {shouldUseMobileOverlay ? (
          <>
            {/* Mobile Input Trigger */}
            <Input
              id={id}
              value={localValue}
              placeholder={placeholder}
              className="h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 cursor-pointer"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
              readOnly
              onClick={() => setShowMobileOverlay(true)}
            />
            
            {/* Mobile Full-Screen Overlay */}
            <MobileFullScreenAutocomplete
              isOpen={showMobileOverlay}
              onClose={() => setShowMobileOverlay(false)}
              value={localValue}
              onChange={handleLocalChange}
              onPlaceSelect={onPlaceSelect}
              placeholder={placeholder}
              label={label}
            />
          </>
        ) : shouldUseServerAutocomplete ? (
          <ServerAutocomplete
            id={id}
            value={localValue}
            onChange={handleLocalChange}
            onPlaceSelect={onPlaceSelect}
            placeholder={placeholder}
            disabled={disabled}
          />
        ) : shouldShowFallback ? (
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
        
        {/* Debug info for development - only show if there are actual issues (not working fallbacks) */}
        {isError && !useServerAutocomplete && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border">
            Debug: Mobile={isMobile.toString()}, Error={isError.toString()}, 
            ShouldFallback={shouldUseFallback.toString()}, ShowFallback={showFallback.toString()},
            ServerAutocomplete={useServerAutocomplete.toString()}
            {isError && errorMessage && <div>Error: {errorMessage}</div>}
            <button 
              onClick={() => setForceAutocomplete(!forceAutocomplete)}
              className="ml-2 text-blue-600 underline"
            >
              {forceAutocomplete ? 'Use Smart Fallback' : 'Force Autocomplete'}
            </button>
            <button 
              onClick={() => setUseServerAutocomplete(!useServerAutocomplete)}
              className="ml-2 text-blue-600 underline"
            >
              {useServerAutocomplete ? 'Use Web Components' : 'Use Server Autocomplete'}
            </button>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

PlaceAutocomplete.displayName = 'PlaceAutocomplete';
