import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TimePicker } from "./TimePicker";
import { cn } from "@/lib/utils";

// Custom inline style to hide the overlay for this picker only
const transparentOverlayStyles = `
  .datetime-picker-no-overlay[data-state="open"]::before {
    content: "";
    display: none !important;
  }
  .datetime-picker-no-overlay .fixed.bg-black\\/80 {
    background: transparent !important;
  }
`;

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

  // Layout: center all content, match calendar width, button same width as calendar
  const CAL_WIDTH = 320; // px, matches Calendar
  const content = (
    <div className="flex flex-col items-center justify-center py-4 w-full" style={{ minWidth: CAL_WIDTH }}>
      <div className="flex justify-center w-full mb-3">
        <Calendar
          selected={value}
          onSelect={d => {
            if (d) handleDaySelect(d);
          }}
          mode="single"
          initialFocus
          disabled={dateDisabled}
          className={cn("p-4 pointer-events-auto w-full max-w-[320px] rounded-lg shadow-md border")}
        />
      </div>
      <div className="flex gap-2 items-center mb-5 w-full justify-center">
        <TimePicker value={value} onChange={handleTimeChange} />
        <span className="text-muted-foreground text-xs">{timeString}</span>
      </div>
      <Button
        size="sm"
        onClick={() => setOpen(false)}
        className="rounded-lg bg-primary text-primary-foreground font-semibold text-base"
        style={{
          width: CAL_WIDTH,
          maxWidth: "100%",
          minWidth: 160,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        Done
      </Button>
    </div>
  );

  // We inject inline style to ensure no overlay (only for this component)
  // SheetContent given unique class for targeting overlay removal
  return (
    <>
      {/* Inline override styles for overlay removal */}
      <style>{transparentOverlayStyles}</style>
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
            "datetime-picker-no-overlay",
            "p-0 m-0 bg-white border-none",
            "flex flex-col items-center justify-center",
            "!max-w-lg w-full",
            "md:top-1/2 md:bottom-auto md:left-1/2 md:translate-y-[-50%] md:-translate-x-1/2 md:fixed md:mx-0 md:rounded-lg"
          )}
          style={{
            minHeight: 440,
            maxHeight: 540,
            padding: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
};
