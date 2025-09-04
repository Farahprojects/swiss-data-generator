import React, { useState, useRef } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/TimePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ElegantDateTimePickerProps {
  dateValue?: string;
  timeValue?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  hasDateError?: boolean;
  hasTimeError?: boolean;
}

export const ElegantDateTimePicker: React.FC<ElegantDateTimePickerProps> = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  hasDateError = false,
  hasTimeError = false
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dateValue ? new Date(dateValue) : undefined
  );

  // Parse existing values
  const [day, month, year] = dateValue ? dateValue.split('-').reverse() : ['', '', ''];
  const [hour, minute] = timeValue ? timeValue.split(':') : ['', ''];
  const [ampm, setAmpm] = useState(
    timeValue && timeValue.includes(':') 
      ? (parseInt(timeValue.split(':')[0]) >= 12 ? 'PM' : 'AM')
      : 'AM'
  );

  // Refs for auto-focus
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setSelectedDate(newDate);
      onDateChange(format(newDate, 'yyyy-MM-dd'));
      setIsDateOpen(false);
    }
  };

  const updateDate = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay && newMonth && newYear) {
      const dateStr = `${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`;
      onDateChange(dateStr);
      setSelectedDate(new Date(dateStr));
    }
  };

  const updateTime = (newHour: string, newMinute: string, newAmpm: string) => {
    if (newHour && newMinute) {
      let hour24 = parseInt(newHour);
      if (newAmpm === 'PM' && hour24 !== 12) hour24 += 12;
      if (newAmpm === 'AM' && hour24 === 12) hour24 = 0;
      
      onTimeChange(`${hour24.toString().padStart(2, '0')}:${newMinute.padStart(2, '0')}`);
    }
  };

  const handleDateInput = (value: string, field: 'day' | 'month' | 'year', nextRef?: React.RefObject<HTMLInputElement>) => {
    const numValue = value.replace(/\D/g, '');
    
    if (field === 'day') {
      if (numValue.length <= 2) {
        const validDay = Math.min(parseInt(numValue) || 0, 31).toString();
        if (numValue.length === 2 && parseInt(numValue) > 0) {
          updateDate(validDay, month, year);
          nextRef?.current?.focus();
        }
        return validDay;
      }
    } else if (field === 'month') {
      if (numValue.length <= 2) {
        const validMonth = Math.min(parseInt(numValue) || 0, 12).toString();
        if (numValue.length === 2 && parseInt(numValue) > 0) {
          updateDate(day, validMonth, year);
          nextRef?.current?.focus();
        }
        return validMonth;
      }
    } else if (field === 'year') {
      if (numValue.length <= 4) {
        if (numValue.length === 4) {
          updateDate(day, month, numValue);
        }
        return numValue;
      }
    }
    return value;
  };

  const handleTimeInput = (value: string, field: 'hour' | 'minute', nextRef?: React.RefObject<HTMLInputElement>) => {
    const numValue = value.replace(/\D/g, '');
    
    if (field === 'hour') {
      if (numValue.length <= 2) {
        const validHour = Math.min(parseInt(numValue) || 0, 12).toString();
        if (numValue.length === 2 && parseInt(numValue) > 0) {
          updateTime(validHour, minute, ampm);
          nextRef?.current?.focus();
        }
        return validHour;
      }
    } else if (field === 'minute') {
      if (numValue.length <= 2) {
        const validMinute = Math.min(parseInt(numValue) || 0, 59).toString();
        if (numValue.length === 2) {
          updateTime(hour, validMinute, ampm);
        }
        return validMinute;
      }
    }
    return value;
  };

  const inputClass = "w-full h-10 text-center border-0 bg-transparent focus:outline-none focus:ring-0 text-sm font-light";
  const containerClass = (hasError: boolean) => cn(
    "inline-flex items-center bg-white border-2 rounded-xl transition-all duration-200 px-3 py-1",
    hasError ? "border-red-300" : "border-gray-200 focus-within:border-gray-400"
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Date Picker */}
      <div className="flex items-center gap-2">
        <div className={containerClass(hasDateError)}>
          <input
            ref={dayRef}
            type="text"
            value={day}
            onChange={(e) => {
              const newValue = handleDateInput(e.target.value, 'day', monthRef);
              updateDate(newValue, month, year);
            }}
            className={cn(inputClass, "w-8")}
            placeholder="DD"
            maxLength={2}
          />
          <span className="text-gray-400 text-sm">/</span>
          <input
            ref={monthRef}
            type="text"
            value={month}
            onChange={(e) => {
              const newValue = handleDateInput(e.target.value, 'month', yearRef);
              updateDate(day, newValue, year);
            }}
            className={cn(inputClass, "w-8")}
            placeholder="MM"
            maxLength={2}
          />
          <span className="text-gray-400 text-sm">/</span>
          <input
            ref={yearRef}
            type="text"
            value={year}
            onChange={(e) => {
              const newValue = handleDateInput(e.target.value, 'year');
              updateDate(day, month, newValue);
            }}
            className={cn(inputClass, "w-12")}
            placeholder="YYYY"
            maxLength={4}
          />
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
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="pointer-events-auto"
              disabled={(date) => date > new Date()}
              captionLayout="dropdown"
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Picker */}
      <div className="flex items-center gap-2">
        <div className={containerClass(hasTimeError)}>
          <input
            ref={hourRef}
            type="text"
            value={hour ? (parseInt(hour) > 12 ? (parseInt(hour) - 12).toString() : (parseInt(hour) === 0 ? '12' : hour)) : ''}
            onChange={(e) => {
              const newValue = handleTimeInput(e.target.value, 'hour', minuteRef);
              updateTime(newValue, minute, ampm);
            }}
            className={cn(inputClass, "w-8")}
            placeholder="HH"
            maxLength={2}
          />
          <span className="text-gray-400 text-sm">:</span>
          <input
            ref={minuteRef}
            type="text"
            value={minute}
            onChange={(e) => {
              const newValue = handleTimeInput(e.target.value, 'minute');
              updateTime(hour, newValue, ampm);
            }}
            className={cn(inputClass, "w-8")}
            placeholder="MM"
            maxLength={2}
          />
          <select
            value={ampm}
            onChange={(e) => {
              setAmpm(e.target.value);
              updateTime(hour, minute, e.target.value);
            }}
            className="ml-2 bg-transparent border-0 focus:outline-none text-sm font-light text-gray-700 cursor-pointer"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
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
            <TimePicker
              value={timeValue}
              onChange={onTimeChange}
              onClose={() => setIsTimeOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};