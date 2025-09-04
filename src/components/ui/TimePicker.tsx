import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  onClose: () => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, onClose }) => {
  const [hour, minute] = value ? value.split(':') : ['12', '00'];
  const [ampm, setAmpm] = useState(
    value && value.includes(':') 
      ? (parseInt(value.split(':')[0]) >= 12 ? 'PM' : 'AM')
      : 'AM'
  );

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const currentHour12 = parseInt(hour) > 12 ? (parseInt(hour) - 12).toString() : (parseInt(hour) === 0 ? '12' : hour);

  const handleTimeChange = (newHour: string, newMinute: string, newAmpm: string) => {
    let hour24 = parseInt(newHour);
    if (newAmpm === 'PM' && hour24 !== 12) hour24 += 12;
    if (newAmpm === 'AM' && hour24 === 12) hour24 = 0;
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute}`;
    onChange(timeString);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200 w-64">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Select Time</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Hours */}
        <div>
          <div className="text-xs text-gray-500 mb-2 text-center">Hour</div>
          <div className="h-32 overflow-y-auto border rounded-lg">
            {hours.map((h) => (
              <button
                key={h}
                onClick={() => handleTimeChange(h.toString(), minute, ampm)}
                className={cn(
                  "w-full px-2 py-1 text-sm hover:bg-gray-100 transition-colors",
                  currentHour12 === h.toString() && "bg-gray-900 text-white"
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Minutes */}
        <div>
          <div className="text-xs text-gray-500 mb-2 text-center">Min</div>
          <div className="h-32 overflow-y-auto border rounded-lg">
            {minutes.filter((_, i) => i % 5 === 0).map((m) => (
              <button
                key={m}
                onClick={() => handleTimeChange(currentHour12, m, ampm)}
                className={cn(
                  "w-full px-2 py-1 text-sm hover:bg-gray-100 transition-colors",
                  minute === m && "bg-gray-900 text-white"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* AM/PM */}
        <div>
          <div className="text-xs text-gray-500 mb-2 text-center">Period</div>
          <div className="h-32 border rounded-lg">
            {['AM', 'PM'].map((period) => (
              <button
                key={period}
                onClick={() => {
                  setAmpm(period);
                  handleTimeChange(currentHour12, minute, period);
                }}
                className={cn(
                  "w-full px-2 py-6 text-sm hover:bg-gray-100 transition-colors",
                  ampm === period && "bg-gray-900 text-white"
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};