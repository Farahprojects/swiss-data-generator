
import React from "react";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
  disabled?: boolean;
};

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className,
  disabled,
}) => {
  const hour = value.getHours();
  const minute = value.getMinutes();

  function setHour(newHour: number) {
    const newDate = new Date(value);
    newDate.setHours(newHour);
    onChange(newDate);
  }
  function setMinute(newMinute: number) {
    const newDate = new Date(value);
    newDate.setMinutes(newMinute);
    onChange(newDate);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        value={hour}
        onChange={e => setHour(Number(e.target.value))}
        disabled={disabled}
        className="rounded px-2 py-1 border"
        aria-label="Hour"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {pad(h)}
          </option>
        ))}
      </select>
      <span className="font-bold text-base">:</span>
      <select
        value={minute}
        onChange={e => setMinute(Number(e.target.value))}
        disabled={disabled}
        className="rounded px-2 py-1 border"
        aria-label="Minute"
      >
        {[0, 15, 30, 45].map(m => (
          <option key={m} value={m}>
            {pad(m)}
          </option>
        ))}
      </select>
    </div>
  );
};
