import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// Utility for month names
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type Props = {
  view: "month" | "week" | "day";
  setView: (view: "month" | "week" | "day") => void;
  onAddSession: () => void;
  today: Date;
  setToday: (date: Date) => void;
  isMobile?: boolean;
};

export const CalendarHeader = ({
  view,
  setView,
  onAddSession,
  today,
  setToday,
  isMobile = false,
}: Props) => {
  function handleMonthSelect(value: string) {
    const monthIndex = parseInt(value, 10);
    if (!isNaN(monthIndex)) {
      // Preserve year and day, only update month
      const newDate = new Date(today);
      newDate.setMonth(monthIndex);
      setToday(newDate);
    }
  }

  function handleWeekClick() {
    setToday(new Date());
  }
  
  function nextUnit() {
    const d = new Date(today);
    if (view === "day") d.setDate(d.getDate() + 1);
    if (view === "week") d.setDate(d.getDate() + 7);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    setToday(d);
  }
  
  function prevUnit() {
    const d = new Date(today);
    if (view === "day") d.setDate(d.getDate() - 1);
    if (view === "week") d.setDate(d.getDate() - 7);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    setToday(d);
  }

  // Compose month selector (dropdown)
  const monthSelector = (
    <Select onValueChange={handleMonthSelect} value={today.getMonth().toString()}>
      <SelectTrigger
        className="w-[56px] h-8 px-2 border-none bg-transparent text-primary font-semibold focus:ring-0 focus:border-none shadow-none text-lg data-[state=open]:bg-transparent hover:bg-accent/20"
        aria-label="Select month"
      >
        <SelectValue>
          {monthNames[today.getMonth()].slice(0,3)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover p-0 min-w-fit w-24 text-sm">
        {monthNames.map((name, idx) => (
          <SelectItem
            value={idx.toString()}
            key={name}
            className="py-1 px-3 text-base"
          >
            {name.slice(0,3)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // Row with month selector and "Week" navigation, session button on right for desktop
  return (
    <div className="flex flex-col items-center gap-0 mb-4 w-full">
      {/* Desktop: inline */}
      <div className="hidden sm:flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          {monthSelector}
          <span className="font-semibold text-lg text-primary">{today.getFullYear()}</span>
          {/* Week nav (unchanged) */}
          <button
            type="button"
            onClick={prevUnit}
            aria-label="Previous"
            className="px-1 text-[1.7rem] font-semibold"
            style={{
              color: "#7C60F9",
              background: "transparent",
              border: "none",
              outline: "none",
              cursor: "pointer",
              lineHeight: "1",
              transition: "color 0.1s"
            }}
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={handleWeekClick}
            className="select-none font-semibold text-lg px-2 py-1 bg-transparent outline-none border-none"
            aria-label="Jump to current week"
            style={{
              color: "#241783",
              cursor: "pointer",
              background: "none",
            }}
          >
            Week
          </button>
          <button
            type="button"
            onClick={nextUnit}
            aria-label="Next"
            className="px-1 text-[1.7rem] font-semibold"
            style={{
              color: "#7C60F9",
              background: "transparent",
              border: "none",
              outline: "none",
              cursor: "pointer",
              lineHeight: "1",
              transition: "color 0.1s"
            }}
          >
            &gt;
          </button>
        </div>
        <button
          onClick={onAddSession}
          className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold ml-4"
        >
          + Session
        </button>
      </div>
      {/* Mobile: row layout, full-width + Session below */}
      <div className="flex sm:hidden flex-col w-full items-center">
        <div className="flex items-center gap-3 justify-center w-full">
          {monthSelector}
          <span className="font-semibold text-lg text-primary">{today.getFullYear()}</span>
          <button
            type="button"
            onClick={prevUnit}
            aria-label="Previous"
            className="px-1 text-[1.7rem] font-semibold"
            style={{
              color: "#7C60F9",
              background: "transparent",
              border: "none",
              outline: "none",
              cursor: "pointer",
              lineHeight: "1",
              transition: "color 0.1s"
            }}
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={handleWeekClick}
            className="select-none font-semibold text-lg px-2 py-1 bg-transparent outline-none border-none"
            aria-label="Jump to current week"
            style={{
              color: "#241783",
              cursor: "pointer",
              background: "none",
            }}
          >
            Week
          </button>
          <button
            type="button"
            onClick={nextUnit}
            aria-label="Next"
            className="px-1 text-[1.7rem] font-semibold"
            style={{
              color: "#7C60F9",
              background: "transparent",
              border: "none",
              outline: "none",
              cursor: "pointer",
              lineHeight: "1",
              transition: "color 0.1s"
            }}
          >
            &gt;
          </button>
        </div>
        <div className="w-full flex justify-center mt-3">
          <button
            onClick={onAddSession}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded font-semibold"
          >
            + Session
          </button>
        </div>
      </div>
    </div>
  );
};
