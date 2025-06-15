
import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
  inline?: boolean; // NEW PROP
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
  const isMobile = useIsMobile();

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
  // 12-hour format
  const hour = value.getHours();
  const hour12 = hour % 12 || 12;
  const minute = value.getMinutes();
  const ampm = hour < 12 ? "AM" : "PM";
  const timeString = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;

  // -- INLINE RENDERING --
  if (inline) {
    return (
      <div
        className={cn(
          "rounded-md border border-muted bg-background p-3 w-full max-w-md",
          className
        )}
        style={{
          // Ensure fits modal
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch"
        }}
      >
        {label && (
          <span className="text-xs font-semibold mb-1">{label}</span>
        )}
        <Calendar
          selected={value}
          onSelect={d => {
            if (d) handleDaySelect(d);
          }}
          mode="single"
          initialFocus
          disabled={dateDisabled}
          className={cn("pointer-events-auto my-2 max-w-full")}
        />
        <div className="flex gap-2 items-center mt-1">
          <TimePicker value={value} onChange={handleTimeChange} />
          <span className="text-muted-foreground text-xs">{timeString}</span>
        </div>
        <div className="flex justify-end mt-2">
          {/* Optionally, let consumer show/hide this button */}
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            type="button"
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
        </div>
      </div>
    );
  }

  // -- POPOVER/SHEET RENDERING (default) --
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
            <div className="flex flex-col gap-2 min-w-[220px]">
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
              <Button
                size="sm"
                onClick={() => setOpen(false)}
                className="flex gap-2 items-center mt-3 justify-center"
              >
                Done
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

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
        <div className="flex flex-col gap-2 min-w-[220px]">
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
          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="flex gap-2 items-center mt-3 justify-center"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
