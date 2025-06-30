
import { useState, useEffect, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useGoogleMapsScript } from './hooks/useGoogleMapsScript';
import { extractPlaceData, PlaceData } from './utils/extractPlaceData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { HTMLGmpPlaceAutocompleteElement } from '@/types/googleMaps';

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
    const { isLoaded, isError, apiKey, errorMessage } = useGoogleMapsScript();
    const autocompleteRef = useRef<HTMLGmpPlaceAutocompleteElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [localValue, setLocalValue] = useState(value);
    const [showFallback, setShowFallback] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isProcessingSelection, setIsProcessingSelection] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const initTimeoutRef = useRef<NodeJS.Timeout>();

    // Detect mobile environment
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
    };

    const handleRetry = () => {
      setRetryCount(prev => prev + 1);
      setShowFallback(false);
      setIsInitializing(false);
      
      // Safe container cleanup
      const container = containerRef.current;
      if (container) {
        // Clear the container safely
        while (container.firstChild && container.contains(container.firstChild)) {
          try {
            container.removeChild(container.firstChild);
          } catch (error) {
            console.warn('Error removing child node:', error);
            break;
          }
        }
      }
      
      // Reset autocomplete ref
      autocompleteRef.current = null;
      
      window.location.reload();
    };

    // Enhanced layout stabilization
    const stabilizeLayout = () => {
      setIsProcessingSelection(true);
      
      // Prevent any scroll interference during processing
      document.body.style.overflow = 'hidden';
      
      // Wait for Google's popup to fully close and DOM to stabilize
      setTimeout(() => {
        // Force complete layout recalculation
        const container = containerRef.current;
        if (container) {
          // Reset container properties
          container.style.height = '48px';
          container.style.minHeight = '48px';
          container.style.maxHeight = '48px';
          container.style.position = 'relative';
          container.style.zIndex = '1';
          
          // Force reflow
          container.offsetHeight;
        }
        
        // Re-enable scroll
        document.body.style.overflow = '';
        
        // Gentle repositioning after full stabilization
        setTimeout(() => {
          const parentCard = container?.closest('[data-person]');
          if (parentCard && isMobile) {
            parentCard.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest',
              inline: 'nearest'
            });
          }
          setIsProcessingSelection(false);
        }, 100);
      }, 300); // Increased timeout for complete Google cleanup
    };

    // Wait for Google Maps custom elements to be ready
    const waitForGoogleCustomElements = async (): Promise<boolean> => {
      try {
        if (!window.customElements || !window.google) {
          return false;
        }
        
        // Wait for the custom element to be defined
        await customElements.whenDefined('gmp-place-autocomplete');
        
        // Additional check to ensure Google Maps is fully ready
        return new Promise((resolve) => {
          const checkReady = () => {
            if (window.google?.maps?.places) {
              resolve(true);
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      } catch (error) {
        console.error('Error waiting for Google custom elements:', error);
        return false;
      }
    };

    // Create autocomplete element with proper error handling
    const createAutocompleteElement = async (): Promise<HTMLGmpPlaceAutocompleteElement | null> => {
      try {
        const autocompleteElement = document.createElement('gmp-place-autocomplete') as HTMLGmpPlaceAutocompleteElement;
        
        // Set basic attributes
        autocompleteElement.id = `${id}-autocomplete`;
        autocompleteElement.setAttribute('placeholder', placeholder);
        autocompleteElement.value = localValue;
        
        // Apply styling
        if (isMobile) {
          autocompleteElement.style.width = containerRef.current?.offsetWidth + 'px' || '100%';
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
          autocompleteElement.style.width = '100%';
          autocompleteElement.style.height = '40px';
          autocompleteElement.style.fontSize = '16px';
          autocompleteElement.style.border = 'none';
          autocompleteElement.style.outline = 'none';
          autocompleteElement.style.background = 'transparent';
        }
        
        return autocompleteElement;
      } catch (error) {
        console.error('Error creating autocomplete element:', error);
        return null;
      }
    };

    // Safe container clearing function
    const clearContainerSafely = (container: HTMLElement) => {
      try {
        // Only clear if container actually has children
        while (container.firstChild) {
          // Double-check the child still exists and is attached
          if (container.contains(container.firstChild)) {
            container.removeChild(container.firstChild);
          } else {
            // If the child is not actually a child, break to prevent infinite loop
            break;
          }
        }
      } catch (error) {
        console.warn('Error clearing container:', error);
        // If there's an error, try alternative method
        try {
          container.innerHTML = '';
        } catch (innerError) {
          console.warn('Error clearing container with innerHTML:', innerError);
        }
      }
    };

    // Enhanced initialization with proper error handling and timeouts
    const initializeAutocomplete = async () => {
      if (!isLoaded || showFallback || !window.google || disabled || isInitializing) {
        return;
      }

      setIsInitializing(true);
      
      // Clear any existing timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }

      // Set a timeout to detect hanging initialization
      initTimeoutRef.current = setTimeout(() => {
        console.error('Google Maps initialization timeout - falling back to manual input');
        setShowFallback(true);
        setIsInitializing(false);
      }, 10000); // 10 second timeout

      try {
        // Wait for Google custom elements to be ready
        const isReady = await waitForGoogleCustomElements();
        
        if (!isReady) {
          console.error('Google Maps custom elements not ready - falling back');
          setShowFallback(true);
          setIsInitializing(false);
          return;
        }

        // Clear timeout if we get this far
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }

        if (autocompleteRef.current) {
          autocompleteRef.current.value = localValue;
          setIsInitializing(false);
          return;
        }
        
        const container = containerRef.current;
        if (!container) {
          console.error('Container not found, falling back to manual input');
          setShowFallback(true);
          setIsInitializing(false);
          return;
        }

        // Only clear container if we're actually reinitializing and it's safe to do so
        if (!autocompleteRef.current && container.children.length > 0) {
          clearContainerSafely(container);
        }

        // Create the autocomplete element
        const autocompleteElement = await createAutocompleteElement();
        
        if (!autocompleteElement) {
          console.error('Failed to create autocomplete element');
          setShowFallback(true);
          setIsInitializing(false);
          return;
        }

        if (isMobile) {
          // Create a backdrop to contain the autocomplete for mobile
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
          
          container.appendChild(backdrop);
        }
        
        container.appendChild(autocompleteElement);
        autocompleteRef.current = autocompleteElement;
        
        // Enhanced event handling with proper cleanup
        autocompleteElement.addEventListener('gmp-select', async (event: Event) => {
          const customEvent = event as any;
          const prediction = customEvent.placePrediction;
          
          if (!prediction) {
            console.error('No place prediction found in event');
            return;
          }
          
          try {
            console.log('🔍 Place prediction selected:', prediction);
            
            // Prevent any scroll during processing
            if (isMobile) {
              event.preventDefault();
              event.stopPropagation();
            }
            
            const place = await prediction.toPlace();
            
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'location']
            });
            
            console.log('🌍 Place details fetched:', place);
            
            const placeData = extractPlaceData(place);
            console.log('📊 Extracted place data:', placeData);
            
            setLocalValue(placeData.name);
            onChange(placeData.name);
            
            if (onPlaceSelect) {
              onPlaceSelect(placeData);
            }
            
            // Enhanced stabilization for mobile
            if (isMobile) {
              stabilizeLayout();
            }
            
            if (placeData.latitude && placeData.longitude) {
              console.log(`📍 Coordinates: ${placeData.latitude}, ${placeData.longitude}`);
            } else {
              toast.error('Selected place has no coordinates (try being more specific)');
            }
          } catch (error) {
            console.error('Error processing place selection:', error);
            toast.error('Could not process place selection');
            if (isMobile) {
              stabilizeLayout();
            }
          }
        });
        
        setIsInitializing(false);
        
      } catch (error) {
        console.error('Error setting up place autocomplete:', error);
        setShowFallback(true);
        setIsInitializing(false);
      }
    };

    useEffect(() => {
      initializeAutocomplete();
      
      // Cleanup timeout on unmount
      return () => {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
      };
    }, [isLoaded, localValue, id, placeholder, onChange, onPlaceSelect, showFallback, disabled, retryCount, isMobile]);

    useEffect(() => {
      if (isError) {
        console.error('Google Maps failed to load, using fallback input');
        setShowFallback(true);
      }
    }, [isError]);

    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value);
        if (autocompleteRef.current) {
          autocompleteRef.current.value = value;
        }
      }
    }, [value]);

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
          <div className="space-y-2">
            <Input
              id={id}
              value={localValue}
              onChange={handleManualInput}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 h-12"
              required={required}
              style={{ fontSize: '16px' }}
            />
            {isError && !disabled && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Location autocomplete unavailable</span>
                {errorMessage && (
                  <span className="text-xs text-red-500">({errorMessage})</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="h-6 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div 
              ref={containerRef}
              id={`${id}-container`} 
              className={`relative h-12 min-h-12 max-h-12 border rounded-md bg-background px-3 py-2 ${
                isMobile ? 'mobile-autocomplete-isolated' : 'mobile-autocomplete-container'
              }`}
              style={{
                isolation: 'isolate',
                contain: isMobile ? 'layout style size' : 'layout style',
                fontSize: '16px',
                overflow: 'hidden'
              }}
            >
              {(!isLoaded || isInitializing) && (
                <div className="flex items-center gap-2 text-muted-foreground h-full">
                  <Loader2 className="h-4 w-4 animate-spin" /> 
                  {isInitializing ? 'Initializing autocomplete...' : 'Loading location services...'}
                </div>
              )}
            </div>
            
            {/* Processing overlay for mobile */}
            {isProcessingSelection && isMobile && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

PlaceAutocomplete.displayName = 'PlaceAutocomplete';
