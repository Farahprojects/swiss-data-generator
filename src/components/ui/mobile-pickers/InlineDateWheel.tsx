
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PickerWheel from './PickerWheel';

interface InlineDateWheelProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
}

const InlineDateWheel = ({ value, onChange }: InlineDateWheelProps) => {
  const months = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 111 }, (_, i) => currentYear - 100 + i);
  }, []);

  const parseDate = useCallback((dateValue: string) => {
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

  const initialDate = useMemo(() => parseDate(value), [parseDate, value]);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(initialDate.month);
  const [selectedDay, setSelectedDay] = useState<number>(initialDate.day);
  const [selectedYear, setSelectedYear] = useState<number>(initialDate.year);

  const getDaysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  }, []);

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = useMemo(() => 
    Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  useEffect(() => {
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    const adjustedDay = Math.min(selectedDay, maxDays);
    
    if (adjustedDay !== selectedDay) {
      setSelectedDay(adjustedDay);
      return;
    }

    const dateString = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${adjustedDay.toString().padStart(2, '0')}`;
    onChange(dateString);
  }, [selectedMonth, selectedDay, selectedYear, onChange, getDaysInMonth]);

  const handleMonthChange = useCallback((value: string) => {
    const monthIndex = months.indexOf(value) + 1;
    setSelectedMonth(monthIndex);
  }, [months]);

  const handleDayChange = useCallback((value: number) => {
    setSelectedDay(value);
  }, []);

  const handleYearChange = useCallback((value: number) => {
    setSelectedYear(value);
  }, []);

  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2">
      <div className="flex-1 min-w-[80px]">
        <div className="text-xs font-medium text-gray-600 text-center mb-2">Month</div>
        <PickerWheel
          options={months}
          value={months[selectedMonth - 1]}
          onChange={handleMonthChange}
          height={200}
          itemHeight={40}
        />
      </div>

      <div className="flex-1 min-w-[60px]">
        <div className="text-xs font-medium text-gray-600 text-center mb-2">Day</div>
        <PickerWheel
          options={days}
          value={selectedDay}
          onChange={handleDayChange}
          height={200}
          itemHeight={40}
        />
      </div>

      <div className="flex-1 min-w-[80px]">
        <div className="text-xs font-medium text-gray-600 text-center mb-2">Year</div>
        <PickerWheel
          options={years}
          value={selectedYear}
          onChange={handleYearChange}
          height={200}
          itemHeight={40}
        />
      </div>
    </div>
  );
};

export default InlineDateWheel;
