
import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TimePicker } from "./TimePicker";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
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

  // Polished modal-like card layout
  const content = (
    <div className="flex flex-col w-full max-w-[370px] min-w-[270px] mx-auto py-2 items-center">
      {label && (
        <span className="w-full text-xs font-semibold mb-1 ml-1 text-left">
          {label}
        </span>
      )}
      <div className="flex justify-center w-full">
        <Calendar
          selected={value}
          onSelect={d => {
            if (d) handleDaySelect(d);
          }}
          mode="single"
          initialFocus
          disabled={dateDisabled}
          className={cn("p-4 pointer-events-auto w-full max-w-[370px]")}
        />
      </div>
      <div className="flex gap-2 items-center w-full mt-3 px-2">
        <TimePicker value={value} onChange={handleTimeChange} />
        <span className="text-muted-foreground text-xs">{timeString}</span>
      </div>
      <Button
        size="sm"
        onClick={() => setOpen(false)}
        className="w-full mt-5 rounded-lg bg-primary text-primary-foreground font-semibold py-3 text-base"
        style={{
          maxWidth: 370,
        }}
      >
        Done
      </Button>
    </div>
  );

  // Always use Sheet popover, make it modal-sized centered on desktop
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
      <Sheet open={open} onOpenChange={v => setOpen(v)}>
        <SheetContent
          side="bottom"
          className={cn(
            "!max-w-md !w-full flex justify-center items-center",
            "h-auto min-h-[420px] max-h-[520px] p-0 md:rounded-lg md:top-1/2 md:bottom-auto md:translate-y-[-50%] md:left-1/2 md:-translate-x-1/2 md:fixed md:mx-0",
            "bg-white shadow-xl"
          )}
          style={{
            minHeight: 420,
            maxHeight: 520,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            padding: 0
          }}
        >
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
};
