import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PickerWheel from './PickerWheel';
import { useDebounced } from '@/hooks/useDebounced';

interface MobileDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
}

const MobileDatePicker = ({ value, onChange }: MobileDatePickerProps) => {
  // 3-letter month abbreviations for iOS-style picker
  const months = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []);

  // Generate years (current year - 100 to current year + 10)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 111 }, (_, i) => currentYear - 100 + i);
  }, []);

  // Helper function to parse initial date from value prop
  const parseInitialDate = useCallback((dateValue: string) => {
    if (!dateValue) {
      const now = new Date();
      return {
        month: now.getMonth() + 1,
        day: now.getDate(),
        year: now.getFullYear()
      };
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      const now = new Date();
      return {
        month: now.getMonth() + 1,
        day: now.getDate(),
        year: now.getFullYear()
      };
    }
    
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
      year: date.getFullYear()
    };
  }, []);

  // Initialize state directly from value prop
  const initialDate = useMemo(() => parseInitialDate(value), [parseInitialDate, value]);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(initialDate.month);
  const [selectedDay, setSelectedDay] = useState<number>(initialDate.day);
  const [selectedYear, setSelectedYear] = useState<number>(initialDate.year);
  const [isInitialized, setIsInitialized] = useState(false);

  // Validate date string format - FIXED: Convert regex match to boolean
  const isValidDate = useCallback((dateStr: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && !!dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  }, []);

  // Get days for selected month/year
  const getDaysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  }, []);

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = useMemo(() => 
    Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Debounced onChange to prevent excessive calls
  const debouncedOnChange = useCallback((dateString: string) => {
    if (isValidDate(dateString)) {
      console.log(`MobileDatePicker onChange: ${dateString}`);
      onChange(dateString);
    }
  }, [onChange, isValidDate]);

  // Synchronize with external value changes only once
  useEffect(() => {
    if (value && !isInitialized) {
      const parsedDate = parseInitialDate(value);
      console.log(`MobileDatePicker initializing with value: ${value}`, parsedDate);
      
      setSelectedMonth(parsedDate.month);
      setSelectedDay(parsedDate.day);
      setSelectedYear(parsedDate.year);
      setIsInitialized(true);
    } else if (!value && !isInitialized) {
      setIsInitialized(true);
    }
  }, [value, isInitialized, parseInitialDate]);

  // Update value when selections change (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    // Adjust day if it's invalid for the selected month/year
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    const adjustedDay = Math.min(selectedDay, maxDays);
    
    if (adjustedDay !== selectedDay) {
      setSelectedDay(adjustedDay);
      return; // Let the next effect cycle handle the onChange
    }

    const dateString = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${adjustedDay.toString().padStart(2, '0')}`;
    debouncedOnChange(dateString);
  }, [selectedMonth, selectedDay, selectedYear, isInitialized, debouncedOnChange, getDaysInMonth]);

  // Handle month change
  const handleMonthChange = useCallback((value: string) => {
    const monthIndex = months.indexOf(value) + 1;
    console.log(`Month changed to: ${value} (${monthIndex})`);
    setSelectedMonth(monthIndex);
  }, [months]);

  // Handle day change
  const handleDayChange = useCallback((value: number) => {
    console.log(`Day changed to: ${value}`);
    setSelectedDay(value);
  }, []);

  // Handle year change
  const handleYearChange = useCallback((value: number) => {
    console.log(`Year changed to: ${value}`);
    setSelectedYear(value);
  }, []);

  // Don't render until initialized to prevent flicker
  if (!isInitialized) {
    return <div className="h-[240px] w-full" />;
  }

  return (
    <div className="flex items-center justify-center space-x-4 py-4">
      {/* Month Picker */}
      <div className="flex-1">
        <PickerWheel
          options={months}
          value={months[selectedMonth - 1]}
          onChange={handleMonthChange}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Day Picker */}
      <div className="flex-1">
        <PickerWheel
          options={days}
          value={selectedDay}
          onChange={handleDayChange}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Year Picker */}
      <div className="flex-1">
        <PickerWheel
          options={years}
          value={selectedYear}
          onChange={handleYearChange}
          height={240}
          itemHeight={40}
        />
      </div>
    </div>
  );
};

export default MobileDatePicker;
