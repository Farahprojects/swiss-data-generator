
import React, { useState, useEffect, useMemo } from 'react';
import PickerWheel from './PickerWheel';

interface MobileTimePickerProps {
  value: string; // HH:MM format (24-hour)
  onChange: (time: string) => void;
}

const MobileTimePicker = ({ value, onChange }: MobileTimePickerProps) => {
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []); // 1-12
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []); // 0-59
  const periods: ('AM' | 'PM')[] = useMemo(() => ['AM', 'PM'], []);

  // Convert 24-hour to 12-hour format
  const convertTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hour: hour12, minute: minutes, period };
  };

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = (hour: number, minute: number, period: 'AM' | 'PM') => {
    let hour24 = hour;
    if (period === 'AM' && hour === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Initialize from value
  useEffect(() => {
    if (value) {
      const { hour, minute, period } = convertTo12Hour(value);
      console.log(`MobileTimePicker initializing with value: ${value} -> ${hour}:${minute} ${period}`);
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period);
    }
  }, [value]);

  // Update value when selections change
  useEffect(() => {
    const time24 = convertTo24Hour(selectedHour, selectedMinute, selectedPeriod);
    console.log(`MobileTimePicker onChange: ${selectedHour}:${selectedMinute} ${selectedPeriod} -> ${time24}`);
    onChange(time24);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange]);

  // Create stable keys for the pickers to prevent remounting
  const hourPickerKey = `hour-${selectedHour}`;
  const minutePickerKey = `minute-${selectedMinute}`;
  const periodPickerKey = `period-${selectedPeriod}`;

  return (
    <div className="flex items-center justify-center space-x-4 py-4">
      {/* Hour Picker */}
      <div className="flex-1">
        <PickerWheel
          key={hourPickerKey}
          options={hours}
          value={selectedHour}
          onChange={(value) => {
            console.log(`Hour changed to: ${value}`);
            setSelectedHour(value as number);
          }}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Minute Picker */}
      <div className="flex-1">
        <PickerWheel
          key={minutePickerKey}
          options={minutes.map(m => m.toString().padStart(2, '0'))}
          value={selectedMinute.toString().padStart(2, '0')}
          onChange={(value) => {
            const numValue = parseInt(value as string);
            console.log(`Minute changed to: ${value} (${numValue})`);
            setSelectedMinute(numValue);
          }}
          height={240}
          itemHeight={40}
        />
      </div>

      {/* Period Picker */}
      <div className="flex-1">
        <PickerWheel
          key={periodPickerKey}
          options={periods}
          value={selectedPeriod}
          onChange={(value) => {
            console.log(`Period changed to: ${value}`);
            setSelectedPeriod(value as 'AM' | 'PM');
          }}
          height={240}
          itemHeight={40}
        />
      </div>
    </div>
  );
};

export default MobileTimePicker;
