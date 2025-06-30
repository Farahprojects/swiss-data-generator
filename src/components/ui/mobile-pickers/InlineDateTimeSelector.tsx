
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import InlineDateWheel from './InlineDateWheel';
import InlineTimeWheel from './InlineTimeWheel';

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

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleLocalChange = (newValue: string) => {
    setLocalValue(newValue);
  };

  const handleConfirm = () => {
    // Update the parent component's value immediately
    onChange(localValue);
    onConfirm();
  };

  const handleCancel = () => {
    setLocalValue(value);
    onCancel();
  };

  const handleTriggerClick = () => {
    // This will be handled by the parent component's state management
    // The parent should set isOpen to true when this button is clicked
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
      <Button
        type="button"
        variant="outline"
        onClick={handleTriggerClick}
        className={`flex w-full items-center gap-2 px-3 h-12 justify-start font-normal ${
          hasError ? 'border-red-500 bg-red-50' : 'hover:bg-gray-50'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-gray-500" />
        <span className="text-left text-sm text-gray-900">
          {formatDisplayValue(localValue)}
        </span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 z-40" 
              onClick={handleCancel}
            />
            
            {/* Full width picker */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 text-center">
                    Select {type === 'date' ? 'Date' : 'Time'}
                  </h3>
                </div>
                
                {type === 'date' ? (
                  <InlineDateWheel 
                    value={localValue} 
                    onChange={handleLocalChange} 
                  />
                ) : (
                  <InlineTimeWheel 
                    value={localValue} 
                    onChange={handleLocalChange} 
                  />
                )}
                
                <div className="flex justify-end gap-8 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-blue-600 text-lg font-normal hover:text-blue-800 transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="text-blue-600 text-lg font-semibold hover:text-blue-800 transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineDateTimeSelector;
