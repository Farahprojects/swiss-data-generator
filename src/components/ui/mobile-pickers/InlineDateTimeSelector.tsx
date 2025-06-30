
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Check, X } from 'lucide-react';
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
    onChange(localValue);
    onConfirm();
  };

  const handleCancel = () => {
    setLocalValue(value);
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
      <Button
        type="button"
        variant="outline"
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg mt-1"
          >
            <div className="p-3">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 text-center">
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
              
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="h-3 w-3 mr-1" />
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
