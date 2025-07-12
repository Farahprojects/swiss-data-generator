import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ServerAutocomplete } from './ServerAutocomplete';
import { PlaceData } from '../utils/extractPlaceData';

interface MobileAutocompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeData: PlaceData) => void;
  placeholder?: string;
}

export const MobileAutocompleteModal = ({
  isOpen,
  onClose,
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter a location"
}: MobileAutocompleteModalProps) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handlePlaceSelect = (placeData: PlaceData) => {
    onPlaceSelect?.(placeData);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="fixed inset-0 z-50 bg-background p-0 m-0 max-w-none h-full rounded-none border-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <h2 className="text-lg font-semibold">Select Location</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b bg-background">
            <Input
              ref={inputRef}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              className="text-lg"
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <ServerAutocomplete
              id="mobile-autocomplete"
              value={localValue}
              onChange={handleChange}
              onPlaceSelect={handlePlaceSelect}
              placeholder=""
              disabled={false}
              hideInput={true}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};