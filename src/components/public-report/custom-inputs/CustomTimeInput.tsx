import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CustomTimeInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CustomTimeInput: React.FC<CustomTimeInputProps> = ({ value, onChange }) => {
  const [time, setTime] = useState({ hour: '', minute: '', ampm: 'AM' });

  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const [hourStr, minuteStr] = value.split(':');
      let hour = parseInt(hourStr, 10);
      let ampm = 'AM';
      if (hour >= 12) {
        ampm = 'PM';
        if (hour > 12) {
          hour -= 12;
        }
      }
      if (hour === 0) {
        hour = 12;
      }
      setTime({
        hour: hour.toString().padStart(2, '0'),
        minute: minuteStr || '',
        ampm,
      });
    } else {
      setTime({ hour: '', minute: '', ampm: 'AM' });
    }
  }, [value]);

  const formatTimeForOnChange = (newTime: typeof time) => {
    if (newTime.hour && newTime.minute) {
      let hour24 = parseInt(newTime.hour, 10);
      if (newTime.ampm === 'PM' && hour24 < 12) {
        hour24 += 12;
      } else if (newTime.ampm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      const formattedHour = hour24.toString().padStart(2, '0');
      onChange(`${formattedHour}:${newTime.minute}`);
    } else {
      onChange('');
    }
  };

  const handleTimeChange = (part: 'hour' | 'minute', val: string) => {
    const newTime = { ...time, [part]: val };
    setTime(newTime);
    formatTimeForOnChange(newTime);

    if (part === 'hour' && val.length === 2) {
      minuteRef.current?.focus();
    }
  };
  
  const handleAmPmChange = (newAmPm: 'AM' | 'PM') => {
    const newTime = { ...time, ampm: newAmPm };
    setTime(newTime);
    formatTimeForOnChange(newTime);
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        ref={hourRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="HH"
        value={time.hour}
        onChange={(e) => handleTimeChange('hour', e.target.value)}
        className="w-1/3"
      />
      <Input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="MM"
        value={time.minute}
        onChange={(e) => handleTimeChange('minute', e.target.value)}
        className="w-1/3"
      />
      <div className="flex rounded-md shadow-sm">
        <Button
            type="button"
            variant={time.ampm === 'AM' ? 'default' : 'outline'}
            onClick={() => handleAmPmChange('AM')}
            className="rounded-r-none"
        >
            AM
        </Button>
        <Button
            type="button"
            variant={time.ampm === 'PM' ? 'default' : 'outline'}
            onClick={() => handleAmPmChange('PM')}
            className="rounded-l-none"
        >
            PM
        </Button>
      </div>
    </div>
  );
};

export default CustomTimeInput;
