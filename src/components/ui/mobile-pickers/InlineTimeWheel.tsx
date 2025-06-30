
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PickerWheel from './PickerWheel';

interface InlineTimeWheelProps {
  value: string; // HH:MM format (24-hour)
  onChange: (time: string) => void;
}

const InlineTimeWheel = ({ value, onChange }: InlineTimeWheelProps) => {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const periods: ('AM' | 'PM')[] = useMemo(() => ['AM', 'PM'], []);

  const convertTo12Hour = useCallback((time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hour: hour12, minute: minutes, period };
  }, []);

  const convertTo24Hour = useCallback((hour: number, minute: number, period: 'AM' | 'PM') => {
    let hour24 = hour;
    if (period === 'AM' && hour === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }, []);

  const parseTime = useCallback((timeValue: string) => {
    if (!timeValue) {
      return { hour: 12, minute: 0, period: 'AM' as 'AM' | 'PM' };
    }
    return convertTo12Hour(timeValue);
  }, [convertTo12Hour]);

  const initialTime = useMemo(() => parseTime(value), [parseTime, value]);
  
  const [selectedHour, setSelectedHour] = useState<number>(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialTime.period);

  useEffect(() => {
    const time24 = convertTo24Hour(selectedHour, selectedMinute, selectedPeriod);
    onChange(time24);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange, convertTo24Hour]);

  const handleHourChange = useCallback((value: number) => {
    setSelectedHour(value);
  }, []);

  const handleMinuteChange = useCallback((value: string) => {
    const numValue = parseInt(value);
    setSelectedMinute(numValue);
  }, []);

  const handlePeriodChange = useCallback((value: 'AM' | 'PM') => {
    setSelectedPeriod(value);
  }, []);

  return (
    <div className="flex items-center justify-center gap-8 px-4 py-2">
      <div className="flex-1 min-w-[80px]">
        <div className="text-sm font-medium text-gray-600 text-center mb-3">Hour</div>
        <PickerWheel
          options={hours}
          value={selectedHour}
          onChange={handleHourChange}
          height={200}
          itemHeight={40}
          infinite={true}
        />
      </div>

      <div className="flex-1 min-w-[100px]">
        <div className="text-sm font-medium text-gray-600 text-center mb-3">Minute</div>
        <PickerWheel
          options={minutes.map(m => m.toString().padStart(2, '0'))}
          value={selectedMinute.toString().padStart(2, '0')}
          onChange={handleMinuteChange}
          height={200}
          itemHeight={40}
          infinite={true}
        />
      </div>

      <div className="flex-1 min-w-[80px]">
        <div className="text-sm font-medium text-gray-600 text-center mb-3">Period</div>
        <PickerWheel
          options={periods}
          value={selectedPeriod}
          onChange={handlePeriodChange}
          height={200}
          itemHeight={40}
          infinite={false}
        />
      </div>
    </div>
  );
};

export default InlineTimeWheel;
