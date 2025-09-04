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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(e.target.value);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Date Picker */}
      <div className="relative">
        <Input
          type="date"
          value={dateValue || ''}
          onChange={(e) => {
            onDateChange(e.target.value);
            if (e.target.value) {
              setSelectedDate(new Date(e.target.value));
            }
          }}
          className={cn(
            "h-12 rounded-lg border-gray-200 focus:border-gray-400 pr-10",
            hasDateError && "border-red-500"
          )}
          placeholder="YYYY-MM-DD"
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
        <Input
          type="time"
          value={timeValue || ''}
          onChange={handleTimeChange}
          className={cn(
            "h-12 rounded-lg border-gray-200 focus:border-gray-400 pl-10",
            hasTimeError && "border-red-500"
          )}
          placeholder="HH:MM"
        />
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};