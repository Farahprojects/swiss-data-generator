import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, X, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlaceData } from './utils/extractPlaceData';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CleanPlaceAutocompleteProps {
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

// Prediction type now matches our clean backend response
interface Prediction {
  place_id: string;
  description: string;
}

// We no longer need forwardRef for this internal logic
export const CleanPlaceAutocomplete = ({ 
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
  }: CleanPlaceAutocompleteProps) => {
    const [localValue, setLocalValue] = useState(value);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const debounceRef = useRef<NodeJS.Timeout>();
    const wrapperRef = useRef<HTMLDivElement>(null); // Main wrapper ref for click-outside
    const isMobile = useIsMobile();

    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value);
      }
    }, [value]);

    const searchPlaces = async (input: string) => {
      if (input.length < 2) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
          body: { query: input }
        });

        if (error) throw error;

        // FIXED: Handle the clean array response from our edge function
        const newPredictions = Array.isArray(data) ? data : [];
        setPredictions(newPredictions);
        setIsOpen(newPredictions.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Error searching places:', error);
        setPredictions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchPlaces(newValue), 300);
    };

    const handlePlaceSelect = async (prediction: Prediction) => {
      const fullAddress = prediction.description;
      setLocalValue(fullAddress);
      onChange(fullAddress);
      setIsOpen(false);
      setPredictions([]);

      if (onPlaceSelect) {
        try {
          // FIXED: Call our new, dedicated edge function for details
          const { data: detailsData, error: detailsError } = await supabase.functions.invoke('get-place-details', {
            body: { placeId: prediction.place_id }
          });

          if (detailsError || !detailsData?.geometry?.location) {
            throw new Error(detailsError?.message || 'Could not fetch place details');
          }

          const placeData: PlaceData = {
            name: fullAddress,
            placeId: prediction.place_id,
            latitude: detailsData.geometry.location.lat,
            longitude: detailsData.geometry.location.lng,
          };
          onPlaceSelect(placeData);

        } catch (error) {
          console.error('Error processing place selection:', error);
          // Fallback to basic data without coordinates
          onPlaceSelect({ name: fullAddress, placeId: prediction.place_id });
        }
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || predictions.length === 0) return;
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setHighlightedIndex(p => p < predictions.length - 1 ? p + 1 : p); break;
        case 'ArrowUp': e.preventDefault(); setHighlightedIndex(p => p > 0 ? p - 1 : -1); break;
        case 'Enter': e.preventDefault(); if (highlightedIndex >= 0) { handlePlaceSelect(predictions[highlightedIndex]); } break;
        case 'Escape': setIsOpen(false); setHighlightedIndex(-1); break;
      }
    };

    // FIXED: Simplified click-outside handler using a single wrapper ref
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    return (
      // FIXED: Attach the single wrapperRef here
      <div ref={wrapperRef} className={`relative space-y-2 ${className}`}>
        {label && <Label htmlFor={id}>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>}
        
        {/* Mobile UI is handled separately and doesn't need the wrapper logic */}
        {!isMobile ? (
          <div className="relative">
            <Input
              id={id} value={localValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
              placeholder={placeholder} disabled={disabled} className="h-12 pl-10" />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {isLoading && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />}
            {isOpen && predictions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {predictions.map((p, i) => (
                  <div key={p.place_id} className={`px-3 py-3 cursor-pointer hover:bg-muted ${i === highlightedIndex ? 'bg-muted' : ''}`}
                    onClick={() => handlePlaceSelect(p)}>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{p.description}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Mobile implementation remains largely the same, but we can simplify the input to trigger the overlay
          <Input
            id={id} value={localValue} onFocus={() => setIsOpen(true)} onChange={() => {}} // onChange is handled inside overlay
            placeholder={placeholder} disabled={disabled} readOnly className="h-12 pl-10" />
        )}

        {isMobile && isOpen && (
          <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            <div className="flex items-center p-4 border-b"><button onClick={() => setIsOpen(false)} className="p-2 -ml-2 mr-3"><ArrowLeft /></button><h2>Select Location</h2></div>
            <div className="p-4 border-b"><div className="relative">
              <Input value={localValue} onChange={handleInputChange} placeholder={placeholder} autoFocus className="h-12 pl-10" />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" />
              {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
            </div></div>
            <div className="flex-1 overflow-auto">
              {predictions.map(p => (
                <div key={p.place_id} className="px-4 py-4 border-b" onClick={() => handlePlaceSelect(p)}>
                  <div className="flex items-center gap-3"><MapPin className="h-5 w-5" /><span>{p.description}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
};
