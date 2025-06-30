
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import MobilePickerModal from './MobilePickerModal';
import PickerWheel from './PickerWheel';

interface MobileTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  onModalStateChange?: (isOpen: boolean) => void;
  disableBackdropClose?: boolean;
}

export const MobileTimePicker = ({
  value,
  onChange,
  placeholder = "Select time",
  className = "",
  onModalStateChange,
  disableBackdropClose = false
}: MobileTimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Generate options for the pickers
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 15, 30, 45];
  const periods = ['AM', 'PM'];

  // Parse current value
  const parseTime = (timeString: string) => {
    if (!timeString) return { hour: 12, minute: 0, period: 'AM' };
    
    const [time, period] = timeString.split(' ');
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr);
    
    // Convert 24-hour to 12-hour
    if (hour === 0) hour = 12;
    if (hour > 12) hour = hour - 12;
    
    return {
      hour: hour,
      minute: parseInt(minuteStr),
      period: period || 'AM'
    };
  };

  const currentTime = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(currentTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(currentTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(currentTime.period);

  const handleOpen = () => {
    const current = parseTime(value);
    setSelectedHour(current.hour);
    setSelectedMinute(current.minute);
    setSelectedPeriod(current.period);
    setIsOpen(true);
    onModalStateChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onModalStateChange?.(false);
  };

  const handleConfirm = () => {
    // Convert 12-hour to 24-hour format
    let hour24 = selectedHour;
    if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    } else if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
    handleClose();
  };

  const formatDisplayValue = (timeString: string) => {
    if (!timeString) return '';
    const parsed = parseTime(timeString);
    return `${parsed.hour}:${parsed.minute.toString().padStart(2, '0')} ${parsed.period}`;
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-start text-left font-normal ${className} ${
          !value ? 'text-muted-foreground' : ''
        }`}
        onClick={handleOpen}
      >
        <Clock className="mr-2 h-4 w-4" />
        {value ? formatDisplayValue(value) : placeholder}
      </Button>

      <MobilePickerModal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Select Time"
        disableBackdropClose={disableBackdropClose}
      >
        <div className="flex gap-4 h-48 items-center justify-center">
          <div className="w-16">
            <PickerWheel
              options={hours}
              value={selectedHour}
              onChange={setSelectedHour}
              height={192}
            />
          </div>
          <div className="text-2xl font-semibold text-gray-500 pt-2">:</div>
          <div className="w-16">
            <PickerWheel
              options={minutes}
              value={selectedMinute}
              onChange={setSelectedMinute}
              height={192}
            />
          </div>
          <div className="w-16">
            <PickerWheel
              options={periods}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              height={192}
            />
          </div>
        </div>
      </MobilePickerModal>
    </>
  );
};
