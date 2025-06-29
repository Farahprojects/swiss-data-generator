
import React, { useState, useEffect, useMemo, useRef } from 'react';
import PickerWheel from './PickerWheel';

interface MobileDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
}

const MobileDatePicker = ({ value, onChange }: MobileDatePickerProps) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const isUpdatingFromValue = useRef(false);

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

  // Get days for selected month/year - memoized to prevent unnecessary recreations
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = useMemo(() => 
    Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Initialize from value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        console.log(`MobileDatePicker initializing with value: ${value}`);
        isUpdatingFromValue.current = true;
        setSelectedMonth(date.getMonth() + 1);
        setSelectedDay(date.getDate());
        setSelectedYear(date.getFullYear());
        isUpdatingFromValue.current = false;
      }
    }
  }, [value]);

  // Handle day adjustment when month/year changes
  useEffect(() => {
    if (!isUpdatingFromValue.current) {
      const maxDays = getDaysInMonth(selectedMonth, selectedYear);
      if (selectedDay > maxDays) {
        console.log(`Adjusting day from ${selectedDay} to ${maxDays} for ${selectedMonth}/${selectedYear}`);
        setSelectedDay(maxDays);
        return; // Don't update onChange here, let the next effect handle it
      }
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  // Update value when selections change (but not during initialization)
  useEffect(() => {
    if (!isUpdatingFromValue.current) {
      const maxDays = getDaysInMonth(selectedMonth, selectedYear);
      const adjustedDay = Math.min(selectedDay, maxDays);
      
      const dateString = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${adjustedDay.toString().padStart(2, '0')}`;
      console.log(`MobileDatePicker onChange: ${dateString}`);
      onChange(dateString);
    }
  }, [selectedMonth, selectedDay, selectedYear, onChange]);

  const handleMonthChange = (value: string) => {
    const monthIndex = months.indexOf(value) + 1;
    console.log(`Month changed to: ${value} (${monthIndex})`);
    setSelectedMonth(monthIndex);
  };

  const handleDayChange = (value: number) => {
    console.log(`Day changed to: ${value}`);
    setSelectedDay(value);
  };

  const handleYearChange = (value: number) => {
    console.log(`Year changed to: ${value}`);
    setSelectedYear(value);
  };

  return (
    <div className="flex items-center justify-center space-x-4 py-4">
      {/* Month Picker */}
      <div className="flex-1">
        <PickerWheel
          key="month-picker"
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
          key="day-picker"
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
          key="year-picker"
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
