
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import MobilePickerModal from './MobilePickerModal';
import PickerWheel from './PickerWheel';

interface MobileDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  onModalStateChange?: (isOpen: boolean) => void;
  disableBackdropClose?: boolean;
}

export const MobileDatePicker = ({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
  onModalStateChange,
  disableBackdropClose = false
}: MobileDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Generate options for the pickers
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  // Parse current value
  const parseDate = (dateString: string) => {
    if (!dateString) return { month: 'January', day: 1, year: new Date().getFullYear() };
    
    const date = new Date(dateString);
    return {
      month: months[date.getMonth()],
      day: date.getDate(),
      year: date.getFullYear()
    };
  };

  const currentDate = parseDate(tempValue || value);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month);
  const [selectedDay, setSelectedDay] = useState(currentDate.day);
  const [selectedYear, setSelectedYear] = useState(currentDate.year);

  const handleOpen = () => {
    const current = parseDate(value);
    setSelectedMonth(current.month);
    setSelectedDay(current.day);
    setSelectedYear(current.year);
    setTempValue(value);
    setIsOpen(true);
    onModalStateChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onModalStateChange?.(false);
  };

  const handleConfirm = () => {
    const monthIndex = months.indexOf(selectedMonth);
    const date = new Date(selectedYear, monthIndex, selectedDay);
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    setTempValue(dateString);
    handleClose();
  };

  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? formatDisplayValue(value) : placeholder}
      </Button>

      <MobilePickerModal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Select Date"
        disableBackdropClose={disableBackdropClose}
      >
        <div className="flex gap-2 h-48">
          <div className="flex-1">
            <PickerWheel
              options={months}
              value={selectedMonth}
              onChange={setSelectedMonth}
              height={192}
            />
          </div>
          <div className="w-16">
            <PickerWheel
              options={days}
              value={selectedDay}
              onChange={setSelectedDay}
              height={192}
            />
          </div>
          <div className="w-20">
            <PickerWheel
              options={years}
              value={selectedYear}
              onChange={setSelectedYear}
              height={192}
            />
          </div>
        </div>
      </MobilePickerModal>
    </>
  );
};
