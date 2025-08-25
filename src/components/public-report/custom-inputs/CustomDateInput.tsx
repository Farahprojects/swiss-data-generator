import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CustomDateInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CustomDateInput: React.FC<CustomDateInputProps> = ({ value, onChange }) => {
  const [date, setDate] = useState({ month: '', day: '', year: '' });

  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      setDate({ month: month || '', day: day || '', year: year || '' });
    } else {
      setDate({ month: '', day: '', year: '' });
    }
  }, [value]);

  const handleDateChange = (part: 'month' | 'day' | 'year', val: string) => {
    const newDate = { ...date, [part]: val };
    setDate(newDate);
    
    if (newDate.year.length === 4 && newDate.month.length === 2 && newDate.day.length === 2) {
      onChange(`${newDate.year}-${newDate.month}-${newDate.day}`);
    } else {
      onChange(''); // Or handle partial date state if needed
    }

    if (part === 'month' && val.length === 2) {
      dayRef.current?.focus();
    } else if (part === 'day' && val.length === 2) {
      yearRef.current?.focus();
    }
  };

  return (
    <div className="flex space-x-2">
      <Input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="MM"
        value={date.month}
        onChange={(e) => handleDateChange('month', e.target.value)}
        className="w-1/4"
      />
      <Input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="DD"
        value={date.day}
        onChange={(e) => handleDateChange('day', e.target.value)}
        className="w-1/4"
      />
      <Input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="YYYY"
        value={date.year}
        onChange={(e) => handleDateChange('year', e.target.value)}
        className="w-1/2"
      />
    </div>
  );
};

export default CustomDateInput;
