import React, { useState, useRef } from 'react';
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

  const updateDate = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay && newMonth && newYear) {
      onDateChange(`${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`);
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

  const inputClass = "w-full h-12 text-center border-0 bg-transparent focus:outline-none focus:ring-0 text-base font-light";
  const containerClass = (hasError: boolean) => cn(
    "flex items-center bg-white border-2 rounded-xl transition-all duration-200",
    hasError ? "border-red-300" : "border-gray-200 focus-within:border-gray-400"
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Date Picker */}
      <div>
        <div className={containerClass(hasDateError)}>
          <input
            ref={dayRef}
            type="text"
            value={day}
            onChange={(e) => {
              const newValue = handleDateInput(e.target.value, 'day', monthRef);
              updateDate(newValue, month, year);
            }}
            className={inputClass}
            placeholder="DD"
            maxLength={2}
          />
          <span className="text-gray-400 px-1">/</span>
          <input
            ref={monthRef}
            type="text"
            value={month}
            onChange={(e) => {
              const newValue = handleDateInput(e.target.value, 'month', yearRef);
              updateDate(day, newValue, year);
            }}
            className={inputClass}
            placeholder="MM"
            maxLength={2}
          />
          <span className="text-gray-400 px-1">/</span>
          <input
            ref={yearRef}
            type="text"
            value={year}
            onChange={(e) => {
              const newValue = handleDateInput(e.target.value, 'year');
              updateDate(day, month, newValue);
            }}
            className={inputClass}
            placeholder="YYYY"
            maxLength={4}
          />
        </div>
      </div>

      {/* Time Picker */}
      <div>
        <div className={containerClass(hasTimeError)}>
          <input
            ref={hourRef}
            type="text"
            value={hour ? (parseInt(hour) > 12 ? (parseInt(hour) - 12).toString() : (parseInt(hour) === 0 ? '12' : hour)) : ''}
            onChange={(e) => {
              const newValue = handleTimeInput(e.target.value, 'hour', minuteRef);
              updateTime(newValue, minute, ampm);
            }}
            className={inputClass}
            placeholder="HH"
            maxLength={2}
          />
          <span className="text-gray-400 px-1">:</span>
          <input
            ref={minuteRef}
            type="text"
            value={minute}
            onChange={(e) => {
              const newValue = handleTimeInput(e.target.value, 'minute');
              updateTime(hour, newValue, ampm);
            }}
            className={inputClass}
            placeholder="MM"
            maxLength={2}
          />
          <select
            value={ampm}
            onChange={(e) => {
              setAmpm(e.target.value);
              updateTime(hour, minute, e.target.value);
            }}
            className="ml-2 bg-transparent border-0 focus:outline-none text-base font-light text-gray-700 cursor-pointer"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>
  );
};