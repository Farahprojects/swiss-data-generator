import React, { useState } from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SimpleDatePicker } from './SimpleDatePicker';
import { SimpleTimePicker } from './SimpleTimePicker';
import { cn } from '@/lib/utils';

interface SimpleDateTimePickerProps {
  dateValue?: string;
  timeValue?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  hasDateError?: boolean;
  hasTimeError?: boolean;
}

export const SimpleDateTimePicker: React.FC<SimpleDateTimePickerProps> = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  hasDateError = false,
  hasTimeError = false
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  // Parse values for display
  const [day, month, year] = dateValue ? dateValue.split('-').reverse() : ['', '', ''];
  const [hour, minute] = timeValue ? timeValue.split(':') : ['', ''];
  const displayHour = hour ? (parseInt(hour) > 12 ? (parseInt(hour) - 12).toString() : (parseInt(hour) === 0 ? '12' : hour)) : '';
  const displayMinute = minute || '';
  const ampm = timeValue && timeValue.includes(':') 
    ? (parseInt(timeValue.split(':')[0]) >= 12 ? 'PM' : 'AM')
    : 'AM';

  const containerClass = (hasError: boolean) => cn(
    "inline-flex items-center bg-white border-2 rounded-xl transition-all duration-200 px-4 py-2",
    hasError ? "border-red-300" : "border-gray-200 focus-within:border-gray-400"
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Date Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <div className="flex items-center gap-2">
          <div className={containerClass(hasDateError)}>
            <span className="text-sm font-light text-gray-700">
              {day && month && year ? `${day}/${month}/${year}` : 'Select date'}
            </span>
          </div>
          
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 rounded-xl"
              >
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <SimpleDatePicker
                value={dateValue}
                onChange={onDateChange}
                onClose={() => setIsDateOpen(false)}
                hasError={hasDateError}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Time Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Time</label>
        <div className="flex items-center gap-2">
          <div className={containerClass(hasTimeError)}>
            <span className="text-sm font-light text-gray-700">
              {displayHour && displayMinute ? `${displayHour}:${displayMinute} ${ampm}` : 'Select time'}
            </span>
          </div>
          
          <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 rounded-xl"
              >
                <Clock className="h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <SimpleTimePicker
                value={timeValue}
                onChange={onTimeChange}
                onClose={() => setIsTimeOpen(false)}
                hasError={hasTimeError}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
