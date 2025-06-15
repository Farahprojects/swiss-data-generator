
import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "./TimePicker";
import { cn } from "@/lib/utils";

// Added 'inline' prop
type Props = {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inline?: boolean;
};

export const DateTimePicker: React.FC<Props> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date & time",
  className = "",
  disabled,
  inline = false,
}) => {
  const [open, setOpen] = React.useState(false);

  function handleDaySelect(day: Date) {
    const newDate = new Date(value);
    newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(newDate);
  }
  function handleTimeChange(newTime: Date) {
    const newDate = new Date(value);
    newDate.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    onChange(newDate);
  }
  function dateDisabled(date: Date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }
  const dateString = value ? format(value, "EEE, MMM d yyyy") : "";
  const hour = value.getHours();
  const hour12 = hour % 12 || 12;
  const minute = value.getMinutes();
  const ampm = hour < 12 ? "AM" : "PM";
  const timeString = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;

  // The picker UI itself
  const content = (
    <div className="flex flex-col gap-2 min-w-[260px] max-w-[340px] mx-auto">
      {label && <span className="text-xs font-semibold mb-1">{label}</span>}
      <Calendar
        selected={value}
        onSelect={d => {
          if (d) handleDaySelect(d);
        }}
        mode="single"
        initialFocus
        disabled={dateDisabled}
        className={cn("p-3 pointer-events-auto")}
      />
      <div className="flex gap-2 items-center mt-1">
        <TimePicker value={value} onChange={handleTimeChange} />
        <span className="text-muted-foreground text-xs">{timeString}</span>
      </div>
    </div>
  );

  // Inline mode: always render picker content directly
  if (inline) {
    return (
      <div className={className}>
        {content}
      </div>
    );
  }

  // DEFAULT/FALLBACK: legacy button-triggered Sheet (should not be used anymore)
  return (
    <>
      <Button
        variant="outline"
        type="button"
        className={cn(
          "w-full justify-start flex items-center gap-2",
          !value && "text-muted-foreground",
          className
        )}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <CalendarIcon className="w-4 h-4" />
        {value ? (
          <>
            {dateString}, {timeString}
          </>
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>
      {/* This fallback Sheet is NOT used in EventModal anymore */}
    </>
  );
};
