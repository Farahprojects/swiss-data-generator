
import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  function handleDaySelect(day: Date) {
    // Merge time from previous value
    const newDate = new Date(day);
    newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(newDate);
  }

  function handleTimeChange(newTime: Date) {
    // Merge day from previous value
    const newDate = new Date(value);
    newDate.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    onChange(newDate);
  }

  const dateString = value ? format(value, "EEE, MMM d yyyy") : "";
  const timeString = value ? format(value, "HH:mm") : "";

  // Common min/max restrictions for date picker
  function dateDisabled(date: Date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  const content = (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <span className="text-xs font-semibold mb-1">{label}</span>
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
        <span className="text-muted-foreground text-xs">
          {format(value, "HH:mm")}
        </span>
      </div>
      <Button
        size="sm"
        onClick={() => setOpen(false)}
        className="flex gap-2 items-center mt-3 justify-center"
      >
        <Check className="w-4 h-4" /> Done
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start flex items-center gap-2",
            !value && "text-muted-foreground"
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
            className="!max-w-full !w-screen h-[75dvh] flex flex-col"
            style={{
              minHeight: "55dvh",
              maxHeight: "95dvh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {content}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start flex items-center gap-2",
            !value && "text-muted-foreground"
          )}
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
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
};
