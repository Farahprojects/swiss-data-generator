import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  dateValue?: string;
  timeValue?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  hasDateError?: boolean;
  hasTimeError?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  hasDateError = false,
  hasTimeError = false
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dateValue ? new Date(dateValue) : undefined
  );

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setSelectedDate(newDate);
      onDateChange(format(newDate, 'yyyy-MM-dd'));
      setIsDateOpen(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Auto-format as YYYY-MM-DD
    if (value.length >= 5) {
      value = value.slice(0, 4) + '-' + value.slice(4, 6) + (value.length > 6 ? '-' + value.slice(6, 8) : '');
    } else if (value.length >= 3) {
      value = value.slice(0, 4) + '-' + value.slice(4);
    }
    
    onDateChange(value);
    
    // Try to parse and set selected date if valid
    if (value.length === 10) {
      try {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
      } catch (error) {
        // Invalid date format, ignore
      }
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Auto-format as HH:MM
    if (value.length >= 3) {
      value = value.slice(0, 2) + ':' + value.slice(2, 4);
    }
    
    // Validate hours (00-23) and minutes (00-59)
    if (value.length === 5) {
      const [hours, minutes] = value.split(':');
      const h = parseInt(hours);
      const m = parseInt(minutes);
      
      if (h > 23) {
        value = '23:' + minutes;
      }
      if (m > 59) {
        value = hours + ':59';
      }
    }
    
    onTimeChange(value);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Date Picker */}
      <div className="relative">
        <Input
          type="text"
          value={dateValue || ''}
          onChange={handleDateChange}
          className={cn(
            "h-12 rounded-lg border-gray-200 focus:border-gray-400 pr-10 font-mono",
            hasDateError && "border-red-500"
          )}
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
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
              className="p-3 pointer-events-auto"
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Picker */}
      <div className="relative">
        <div className="relative flex items-center">
          <Input
            type="text"
            value={timeValue || ''}
            onChange={handleTimeChange}
            className={cn(
              "h-12 rounded-lg border-gray-200 focus:border-gray-400 pl-10 pr-16 font-mono",
              hasTimeError && "border-red-500"
            )}
            placeholder="HH:MM"
            maxLength={5}
          />
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={timeValue && timeValue.includes(':') ? (parseInt(timeValue.split(':')[0]) >= 12 ? 'PM' : 'AM') : 'AM'}
            onChange={(e) => {
              if (timeValue && timeValue.includes(':')) {
                const [hours, minutes] = timeValue.split(':');
                let newHours = parseInt(hours);
                
                if (e.target.value === 'PM' && newHours < 12) {
                  newHours += 12;
                } else if (e.target.value === 'AM' && newHours >= 12) {
                  newHours -= 12;
                } else if (e.target.value === 'AM' && newHours === 0) {
                  newHours = 0; // midnight
                }
                
                onTimeChange(`${newHours.toString().padStart(2, '0')}:${minutes}`);
              }
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none text-sm font-medium text-gray-600 focus:outline-none cursor-pointer"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>
  );
};