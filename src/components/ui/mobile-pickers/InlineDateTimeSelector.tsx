
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
        className={`flex w-full items-center gap-3 px-4 h-12 justify-start font-normal text-left ${
          hasError 
            ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-50' 
            : 'hover:bg-gray-50 text-gray-900'
        } ${isOpen ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-300'}`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${hasError ? 'text-red-500' : 'text-gray-500'}`} />
        <span className="text-sm font-medium">
          {formatDisplayValue(localValue)}
        </span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 380, opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
            className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-xl mt-2 z-50"
            style={{ 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select {type === 'date' ? 'Date' : 'Time'}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  {type === 'date' ? 'Choose your birth date' : 'Choose your birth time'}
                </p>
              </div>
              
              {/* Picker Content */}
              <div className="mb-6">
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
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-11 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
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
