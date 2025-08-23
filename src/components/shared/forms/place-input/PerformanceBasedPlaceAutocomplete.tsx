
import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientAutocomplete } from './components/ClientAutocomplete';
import { ServerAutocomplete } from './components/ServerAutocomplete';
import { PlaceData } from './utils/extractPlaceData';

export interface PerformanceBasedPlaceAutocompleteProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  onNameEntry?: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  error?: string;
}

export const PerformanceBasedPlaceAutocomplete = ({ 
  label = "Location", 
  value = "", 
  onChange, 
  onPlaceSelect, 
  onNameEntry,
  placeholder = "Enter a location", 
  required = false, 
  className = "", 
  id = "placeAutocomplete",
  disabled = false,
  error
}: PerformanceBasedPlaceAutocompleteProps) => {
  const [performanceMode, setPerformanceMode] = useState<'client' | 'server'>('client');
  const [hasTestedPerformance, setHasTestedPerformance] = useState(false);

  // Test performance on first name entry
  useEffect(() => {
    if (!hasTestedPerformance && value && value.length >= 2) {
      const testStart = performance.now();
      
      // Simulate a quick performance test
      setTimeout(() => {
        const testEnd = performance.now();
        const duration = testEnd - testStart;
        
        // If performance is poor, switch to server mode
        setPerformanceMode(duration > 100 ? 'server' : 'client');
        setHasTestedPerformance(true);
        
        // Trigger name entry callback
        if (onNameEntry) {
          onNameEntry(value);
        }
      }, 50);
    }
  }, [value, hasTestedPerformance, onNameEntry]);

  const commonProps = useMemo(() => ({
    id,
    value,
    onChange,
    onPlaceSelect,
    placeholder,
    disabled,
    className: 'w-full'
  }), [id, value, onChange, onPlaceSelect, placeholder, disabled]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={id} className="block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {performanceMode === 'client' ? (
        <ClientAutocomplete 
          {...commonProps}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-form-type="other"
        />
      ) : (
        <ServerAutocomplete 
          {...commonProps}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-form-type="other"
        />
      )}
      
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
