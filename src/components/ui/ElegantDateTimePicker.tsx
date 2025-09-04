import React, { useState, useRef, useEffect } from 'react';
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

  // Parse existing values for display
  const [day, month, year] = dateValue ? dateValue.split('-').reverse() : ['', '', ''];
  const [hour, minute] = timeValue ? timeValue.split(':') : ['', ''];
  const [ampm, setAmpm] = useState(
    timeValue && timeValue.includes(':') 
      ? (parseInt(timeValue.split(':')[0]) >= 12 ? 'PM' : 'AM')
      : 'AM'
  );

  // Refs for manual input
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  // Update date from manual input
  const updateDate = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay && newMonth && newYear && newDay.length >= 1 && newMonth.length >= 1 && newYear.length >= 4) {
      const dateStr = `${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`;
      onDateChange(dateStr);
      
      // Update calendar selection
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
      } catch (error) {
        // Invalid date, ignore
      }
    }
  };

  // Update time from manual input
  const updateTime = (newHour: string, newMinute: string, newAmpm: string) => {
    if (newHour && newMinute && newHour.length >= 1 && newMinute.length >= 1) {
      let hour24 = parseInt(newHour);
      if (newAmpm === 'PM' && hour24 !== 12) hour24 += 12;
      if (newAmpm === 'AM' && hour24 === 12) hour24 = 0;
      
      const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.padStart(2, '0')}`;
      onTimeChange(timeString);
    }
  };

  // Handle date selection from calendar
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setSelectedDate(newDate);
      const formattedDate = format(newDate, 'yyyy-MM-dd');
      onDateChange(formattedDate);
      setIsDateOpen(false);
      
      // Update manual input fields
      const [newYear, newMonth, newDay] = formattedDate.split('-');
      if (dayRef.current) dayRef.current.value = newDay;
      if (monthRef.current) monthRef.current.value = newMonth;
      if (yearRef.current) yearRef.current.value = newYear;
    }
  };

  // Handle manual date input - Fixed to avoid double state updates
  const handleDateInput = (value: string, field: 'day' | 'month' | 'year', nextRef?: React.RefObject<HTMLInputElement>) => {
    const numValue = value.replace(/\D/g, '');
    
    if (field === 'day') {
      const validDay = Math.min(parseInt(numValue) || 0, 31).toString();
      if (numValue.length === 2 && parseInt(numValue) > 0 && parseInt(numValue) <= 31) {
        // Get current values from refs to avoid stale state
        const currentMonth = monthRef.current?.value || month;
        const currentYear = yearRef.current?.value || year;
        updateDate(validDay, currentMonth, currentYear);
        nextRef?.current?.focus();
      } else if (numValue.length <= 2) {
        const currentMonth = monthRef.current?.value || month;
        const currentYear = yearRef.current?.value || year;
        updateDate(validDay, currentMonth, currentYear);
      }
      return validDay;
    } else if (field === 'month') {
      const validMonth = Math.min(parseInt(numValue) || 0, 12).toString();
      if (numValue.length === 2 && parseInt(numValue) > 0 && parseInt(numValue) <= 12) {
        const currentDay = dayRef.current?.value || day;
        const currentYear = yearRef.current?.value || year;
        updateDate(currentDay, validMonth, currentYear);
        nextRef?.current?.focus();
      } else if (numValue.length <= 2) {
        const currentDay = dayRef.current?.value || day;
        const currentYear = yearRef.current?.value || year;
        updateDate(currentDay, validMonth, currentYear);
      }
      return validMonth;
    } else if (field === 'year') {
      if (numValue.length === 4) {
        const currentDay = dayRef.current?.value || day;
        const currentMonth = monthRef.current?.value || month;
        updateDate(currentDay, currentMonth, numValue);
      }
      return numValue;
    }
    return value;
  };

  // Handle manual time input - Fixed to avoid double state updates
  const handleTimeInput = (value: string, field: 'hour' | 'minute', nextRef?: React.RefObject<HTMLInputElement>) => {
    const numValue = value.replace(/\D/g, '');
    
    if (field === 'hour') {
      const validHour = Math.min(parseInt(numValue) || 1, 12).toString();
      if (numValue.length === 2 && parseInt(numValue) > 0 && parseInt(numValue) <= 12) {
        // Get current values from refs to avoid stale state
        const currentMinute = minuteRef.current?.value || minute;
        updateTime(validHour, currentMinute, ampm);
        nextRef?.current?.focus();
      } else if (numValue.length <= 2) {
        const currentMinute = minuteRef.current?.value || minute;
        updateTime(validHour, currentMinute, ampm);
      }
      return validHour;
    } else if (field === 'minute') {
      const validMinute = Math.min(parseInt(numValue) || 0, 59).toString().padStart(2, '0');
      if (numValue.length === 2) {
        const currentHour = hourRef.current?.value || hour;
        updateTime(currentHour, validMinute, ampm);
      } else if (numValue.length <= 2) {
        const currentHour = hourRef.current?.value || hour;
        updateTime(currentHour, validMinute, ampm);
      }
      return validMinute;
    }
    return value;
  };

  // Clean, elegant styling
  const inputClass = "w-full h-10 text-center border-0 bg-transparent focus:outline-none focus:ring-0 text-sm font-light";
  const containerClass = (hasError: boolean) => cn(
    "inline-flex items-center bg-white border-2 rounded-xl transition-all duration-200 px-4 py-2",
    hasError ? "border-red-300" : "border-gray-200 focus-within:border-gray-400"
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Date Picker - Clean & Simple */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <div className="flex items-center gap-2">
          <div className={containerClass(hasDateError)}>
            <input
              ref={dayRef}
              type="text"
              defaultValue={day}
              onChange={(e) => {
                handleDateInput(e.target.value, 'day', monthRef);
              }}
              className={cn(inputClass, "w-8")}
              placeholder="DD"
              maxLength={2}
            />
            <span className="text-gray-400 text-sm">/</span>
            <input
              ref={monthRef}
              type="text"
              defaultValue={month}
              onChange={(e) => {
                handleDateInput(e.target.value, 'month', yearRef);
              }}
              className={cn(inputClass, "w-8")}
              placeholder="MM"
              maxLength={2}
            />
            <span className="text-gray-400 text-sm">/</span>
            <input
              ref={yearRef}
              type="text"
              defaultValue={year}
              onChange={(e) => {
                handleDateInput(e.target.value, 'year');
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
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Time Picker - Clean & Simple */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Time</label>
        <div className="flex items-center gap-2">
          <div className={containerClass(hasTimeError)}>
            <input
              ref={hourRef}
              type="text"
              defaultValue={hour ? (parseInt(hour) > 12 ? (parseInt(hour) - 12).toString() : (parseInt(hour) === 0 ? '12' : hour)) : ''}
              onChange={(e) => {
                handleTimeInput(e.target.value, 'hour', minuteRef);
              }}
              className={cn(inputClass, "w-8")}
              placeholder="HH"
              maxLength={2}
            />
            <span className="text-gray-400 text-sm">:</span>
            <input
              ref={minuteRef}
              type="text"
              defaultValue={minute}
              onChange={(e) => {
                handleTimeInput(e.target.value, 'minute');
              }}
              className={cn(inputClass, "w-8")}
              placeholder="MM"
              maxLength={2}
            />
            <select
              value={ampm}
              onChange={(e) => {
                setAmpm(e.target.value);
                const currentHour = hourRef.current?.value || hour;
                const currentMinute = minuteRef.current?.value || minute;
                updateTime(currentHour, currentMinute, e.target.value);
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
    </div>
  );
};