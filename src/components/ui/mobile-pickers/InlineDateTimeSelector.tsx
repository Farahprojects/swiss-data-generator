
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Check, X } from 'lucide-react';
import { MobileDatePicker, MobileTimePicker } from '@/components/ui/mobile-pickers';

interface InlineDateTimeSelectorProps {
  type: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
  placeholder: string;
  hasError?: boolean;
}

const InlineDateTimeSelector = ({
  type,
  value,
  onChange,
  onConfirm,
  onCancel,
  isOpen,
  placeholder,
  hasError = false
}: InlineDateTimeSelectorProps) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleLocalChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    setLocalValue(value); // Reset to original value
    onChange(value);
    onCancel();
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return placeholder;
    
    if (type === 'date') {
      const date = new Date(val);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } else {
      const [hours, minutes] = val.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${period}`;
    }
  };

  const Icon = type === 'date' ? Calendar : Clock;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className={`flex w-full items-center gap-2 px-3 h-12 ${
          hasError ? 'border-red-500 ring-1 ring-red-500' : ''
        }`}
        style={{ 
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="grow text-left font-normal text-sm">
          {formatDisplayValue(localValue)}
        </span>
      </Button>

      {/* Inline Picker */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg mt-2"
          >
            <div className="p-4">
              {type === 'date' ? (
                <MobileDatePicker 
                  value={localValue} 
                  onChange={handleLocalChange} 
                />
              ) : (
                <MobileTimePicker 
                  value={localValue} 
                  onChange={handleLocalChange} 
                />
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                  style={{ 
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  style={{ 
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <Check className="h-4 w-4" />
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineDateTimeSelector;
