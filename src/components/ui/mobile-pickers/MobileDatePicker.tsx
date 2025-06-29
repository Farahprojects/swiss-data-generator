
import React, { useState, useEffect, useMemo } from 'react';
import PickerWheel from './PickerWheel';

interface MobileDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
}

const MobileDatePicker = ({ value, onChange }: MobileDatePickerProps) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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

  // Get days for selected month/year
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
        setSelectedMonth(date.getMonth() + 1);
        setSelectedDay(date.getDate());
        setSelectedYear(date.getFullYear());
      }
    }
  }, [value]);

  // Update value when selections change
  useEffect(() => {
    // Adjust day if it's invalid for the selected month/year
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    const adjustedDay = Math.min(selectedDay, maxDays);
    
    if (adjustedDay !== selectedDay) {
      setSelectedDay(adjustedDay);
    }

    const dateString = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${adjustedDay.toString().padStart(2, '0')}`;
    console.log(`MobileDatePicker onChange: ${dateString}`);
    onChange(dateString);
  }, [selectedMonth, selectedDay, selectedYear, onChange]);

  // Create stable keys for the pickers to prevent remounting
  const monthPickerKey = `month-${months[selectedMonth - 1]}`;
  const dayPickerKey = `day-${selectedDay}`;
  const yearPickerKey = `year-${selectedYear}`;

  return (
    <div className="flex items-center justify-center space-x-4 py-4">
      {/* Month Picker */}
      <div className="flex-1">
        <PickerWheel
          key={monthPickerKey}
          options={months}
          value={months[selectedMonth - 1]}
          onChange={(value) => {
            const monthIndex = months.indexOf(value as string) + 1;
            console.log(`Month changed to: ${value} (${monthIndex})`);
            setSelectedMonth(monthIndex);
          }}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Day Picker */}
      <div className="flex-1">
        <PickerWheel
          key={dayPickerKey}
          options={days}
          value={selectedDay}
          onChange={(value) => {
            console.log(`Day changed to: ${value}`);
            setSelectedDay(value as number);
          }}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Year Picker */}
      <div className="flex-1">
        <PickerWheel
          key={yearPickerKey}
          options={years}
          value={selectedYear}
          onChange={(value) => {
            console.log(`Year changed to: ${value}`);
            setSelectedYear(value as number);
          }}
          height={240}
          itemHeight={40}
        />
      </div>
    </div>
  );
};

export default MobileDatePicker;
