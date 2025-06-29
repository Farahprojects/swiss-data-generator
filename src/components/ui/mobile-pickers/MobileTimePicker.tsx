
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PickerWheel from './PickerWheel';

interface MobileTimePickerProps {
  value: string; // HH:MM format (24-hour)
  onChange: (time: string) => void;
}

const MobileTimePicker = ({ value, onChange }: MobileTimePickerProps) => {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []); // 1-12
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []); // 0-59
  const periods: ('AM' | 'PM')[] = useMemo(() => ['AM', 'PM'], []);

  // Convert 24-hour to 12-hour format
  const convertTo12Hour = useCallback((time24: string) => {
    if (!time24) {
      return { hour: 12, minute: 0, period: 'AM' as const };
    }
    
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return { hour: 12, minute: 0, period: 'AM' as const };
    }
    
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hour: hour12, minute: minutes, period };
  }, []);

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = useCallback((hour: number, minute: number, period: 'AM' | 'PM') => {
    let hour24 = hour;
    if (period === 'AM' && hour === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }, []);

  // Initialize state directly from value prop
  const initialTime = useMemo(() => convertTo12Hour(value), [convertTo12Hour, value]);
  
  const [selectedHour, setSelectedHour] = useState<number>(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialTime.period);
  const [isInitialized, setIsInitialized] = useState(false);

  // Debounced onChange to prevent excessive calls
  const debouncedOnChange = useCallback((timeString: string) => {
    console.log(`MobileTimePicker onChange: ${timeString}`);
    onChange(timeString);
  }, [onChange]);

  // Synchronize with external value changes only once
  useEffect(() => {
    if (value && !isInitialized) {
      const { hour, minute, period } = convertTo12Hour(value);
      console.log(`MobileTimePicker initializing with value: ${value} -> ${hour}:${minute} ${period}`);
      
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period);
      setIsInitialized(true);
    } else if (!value && !isInitialized) {
      setIsInitialized(true);
    }
  }, [value, isInitialized, convertTo12Hour]);

  // Update value when selections change (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const time24 = convertTo24Hour(selectedHour, selectedMinute, selectedPeriod);
    debouncedOnChange(time24);
  }, [selectedHour, selectedMinute, selectedPeriod, isInitialized, convertTo24Hour, debouncedOnChange]);

  // Handle hour change
  const handleHourChange = useCallback((value: number) => {
    console.log(`Hour changed to: ${value}`);
    setSelectedHour(value);
  }, []);

  // Handle minute change
  const handleMinuteChange = useCallback((value: string) => {
    const numValue = parseInt(value, 10);
    console.log(`Minute changed to: ${value} (${numValue})`);
    setSelectedMinute(numValue);
  }, []);

  // Handle period change
  const handlePeriodChange = useCallback((value: 'AM' | 'PM') => {
    console.log(`Period changed to: ${value}`);
    setSelectedPeriod(value);
  }, []);

  // Don't render until initialized to prevent flicker
  if (!isInitialized) {
    return <div className="h-[240px] w-full" />;
  }

  return (
    <div className="flex items-center justify-center space-x-4 py-4">
      {/* Hour Picker */}
      <div className="flex-1">
        <PickerWheel
          options={hours}
          value={selectedHour}
          onChange={handleHourChange}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Minute Picker */}
      <div className="flex-1">
        <PickerWheel
          options={minutes.map(m => m.toString().padStart(2, '0'))}
          value={selectedMinute.toString().padStart(2, '0')}
          onChange={handleMinuteChange}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Period Picker */}
      <div className="flex-1">
        <PickerWheel
          options={periods}
          value={selectedPeriod}
          onChange={handlePeriodChange}
          height={240}
          itemHeight={40}
        />
      </div>
    </div>
  );
};

export default MobileTimePicker;
