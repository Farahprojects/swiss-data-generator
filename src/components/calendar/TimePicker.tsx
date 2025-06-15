import React from "react";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
  disabled?: boolean;
};

function to12Hour(hour: number) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return { h, ampm };
}
function from12Hour(h: number, ampm: "AM" | "PM") {
  return ampm === "AM" ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
}
function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className,
  disabled,
}) => {
  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const { h: hour12, ampm } = to12Hour(hour24);

  function setHour12(newHour12: number, nextAmPm?: "AM" | "PM") {
    const ampmValue = nextAmPm || ampm;
    const hour24 = from12Hour(newHour12, ampmValue);
    const newDate = new Date(value);
    newDate.setHours(hour24);
    onChange(newDate);
  }
  function setMinute(newMinute: number) {
    const newDate = new Date(value);
    newDate.setMinutes(newMinute);
    onChange(newDate);
  }
  function setAmPm(newAmPm: "AM" | "PM") {
    setHour12(hour12, newAmPm);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        value={hour12}
        onChange={e => setHour12(Number(e.target.value))}
        disabled={disabled}
        className="rounded px-2 py-1 border"
        aria-label="Hour"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>
            {h}
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
      <select
        value={ampm}
        onChange={e => setAmPm(e.target.value === "AM" ? "AM" : "PM")}
        disabled={disabled}
        className="rounded px-2 py-1 border"
        aria-label="AM/PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};
