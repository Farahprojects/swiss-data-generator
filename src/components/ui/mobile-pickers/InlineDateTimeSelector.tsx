
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onOpen?: () => void;
}

const InlineDateTimeSelector = ({
  type,
  value,
  onChange,
  onConfirm,
  onCancel,
  isOpen,
  placeholder,
  hasError = false,
  onOpen
}: InlineDateTimeSelectorProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [isAm, setIsAm] = useState(true);

  useEffect(() => {
    setLocalValue(value);
    // Parse AM/PM from existing time value
    if (type === 'time' && value) {
      const [hours] = value.split(':');
      const hour24 = parseInt(hours, 10);
      setIsAm(hour24 < 12);
    }
  }, [value, type]);

  const handleLocalChange = (newValue: string) => {
    setLocalValue(newValue);
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Format date input (DD/MM/YYYY)
    if (type === 'date') {
      // Remove non-numeric characters except slashes
      inputValue = inputValue.replace(/[^\d/]/g, '');
      
      // Auto-format with slashes
      if (inputValue.length >= 2 && !inputValue.includes('/')) {
        inputValue = inputValue.slice(0, 2) + '/' + inputValue.slice(2);
      }
      if (inputValue.length >= 5 && inputValue.split('/').length === 2) {
        inputValue = inputValue.slice(0, 5) + '/' + inputValue.slice(5, 9);
      }
    }
    
    // Format time input (HH:MM)
    if (type === 'time') {
      // Remove non-numeric characters except colons
      inputValue = inputValue.replace(/[^\d:]/g, '');
      
      // Auto-format with colon
      if (inputValue.length >= 2 && !inputValue.includes(':')) {
        inputValue = inputValue.slice(0, 2) + ':' + inputValue.slice(2, 4);
      }
    }
    
    setLocalValue(inputValue);
    onChange(inputValue);
  };

  const handleAmPmToggle = () => {
    if (type === 'time' && localValue) {
      const [hours, minutes] = localValue.split(':');
      const hour24 = parseInt(hours, 10);
      let newHour24;
      
      if (isAm && hour24 >= 12) {
        newHour24 = hour24 - 12;
      } else if (!isAm && hour24 < 12) {
        newHour24 = hour24 + 12;
      } else {
        newHour24 = hour24;
      }
      
      const newValue = `${newHour24.toString().padStart(2, '0')}:${minutes}`;
      setLocalValue(newValue);
      onChange(newValue);
    }
    setIsAm(!isAm);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Update the parent component's value immediately
    onChange(localValue);
    onConfirm();
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpen) {
      onOpen();
    }
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return placeholder;
    
    if (type === 'date') {
      // Format as DD/MM/YYYY for display
      const date = new Date(val);
      if (isNaN(date.getTime())) return val; // Return raw value if invalid date
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } else {
      const [hours, minutes] = val.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${period}`;
    }
  };

  const getInputPlaceholder = () => {
    if (type === 'date') return 'DD/MM/YYYY';
    return 'HH:MM';
  };

  const Icon = type === 'date' ? Calendar : Clock;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={localValue}
            onChange={handleTextInputChange}
            placeholder={getInputPlaceholder()}
            className={`h-12 text-base font-light ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-gray-400'
            }`}
          />
          <button
            type="button"
            onClick={handleTriggerClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <Icon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        
        {type === 'time' && localValue && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAmPmToggle}
            className="h-12 px-3 text-sm font-medium border-gray-200 hover:bg-gray-50"
          >
            {isAm ? 'AM' : 'PM'}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
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
              
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-100">
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineDateTimeSelector;
