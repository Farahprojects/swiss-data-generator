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
      const newDate = new Date(today);
      newDate.setMonth(monthIndex);
      setToday(newDate);
    }
  }

  function handleYearSelect(value: string) {
    const yearInt = parseInt(value, 10);
    if (!isNaN(yearInt)) {
      const newDate = new Date(today);
      newDate.setFullYear(yearInt);
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

  // Month selector - font size reduced to text-base
  const monthSelector = (
    <Select onValueChange={handleMonthSelect} value={today.getMonth().toString()}>
      <SelectTrigger
        className="w-[74px] h-8 px-2 border-none bg-transparent text-primary font-semibold focus:ring-0 focus:border-none shadow-none text-base data-[state=open]:bg-transparent hover:bg-accent/20"
        aria-label="Select month"
        style={{ minWidth: 56, marginRight: 0, marginLeft: 0 }}
      >
        <SelectValue>
          {monthNames[today.getMonth()].slice(0, 3)}
        </SelectValue>
        <span style={{ display: "none" }} aria-hidden="true" />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover p-0 min-w-fit w-24 text-sm">
        {monthNames.map((name, idx) => (
          <SelectItem
            value={idx.toString()}
            key={name}
            className={`py-2 px-3 text-base rounded-none pl-3 [&>span:first-child]:hidden ${
              today.getMonth() === idx
                ? "bg-accent/40 text-primary font-bold"
                : "bg-transparent text-popover-foreground font-normal"
            }`}
            style={{ transition: "background 0.15s, color 0.15s" }}
          >
            {name.slice(0, 3)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // Year selector - text-base, widened further so '2025' etc. is never cut off
  const thisYear = today.getFullYear();
  const yearRange = Array.from({ length: 7 }, (_, i) => thisYear - 3 + i);

  const yearSelector = (
    <Select onValueChange={handleYearSelect} value={thisYear.toString()}>
      <SelectTrigger
        className="w-[80px] h-8 px-2 border-none bg-transparent text-primary font-semibold focus:ring-0 focus:border-none shadow-none text-base data-[state=open]:bg-transparent hover:bg-accent/20"
        aria-label="Select year"
        style={{ minWidth: 76, marginRight: 0, marginLeft: 0 }}
      >
        <SelectValue>{thisYear}</SelectValue>
        <span style={{ display: "none" }} aria-hidden="true" />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover p-0 min-w-fit w-24 text-base max-h-64 overflow-y-auto">
        {yearRange.map((year) => (
          <SelectItem
            value={year.toString()}
            key={year}
            className={`py-2 px-5 text-base rounded-none pl-3 [&>span:first-child]:hidden ${
              thisYear === year
                ? "bg-accent/40 text-primary font-bold"
                : "bg-transparent text-popover-foreground font-normal"
            }`}
            style={{ transition: "background 0.15s, color 0.15s" }}
          >
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // --- Main return ---
  return (
    <div className="flex flex-col items-center gap-0 mb-4 w-full">
      {/* Desktop: inline */}
      <div className="hidden sm:flex w-full items-center justify-between">
        <div className="flex items-center gap-1">
          {monthSelector}
          {yearSelector}
          <button
            type="button"
            onClick={prevUnit}
            aria-label="Previous"
            className="px-1 text-[1.5rem] font-semibold"
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
            className="font-semibold text-base px-2 py-1 border-none outline-none shadow-none bg-transparent"
            aria-label="Jump to current week"
            style={{
              minWidth: 48,
              margin: "0 2px",
              cursor: "pointer",
              fontWeight: 700,
              background: "none",
              color: '#7C60F9',
              borderRadius: 0,
            }}
          >
            Week
          </button>
          <button
            type="button"
            onClick={nextUnit}
            aria-label="Next"
            className="px-1 text-[1.5rem] font-semibold"
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
        <div className="flex items-center gap-1 justify-center w-full">
          {monthSelector}
          {yearSelector}
          <button
            type="button"
            onClick={prevUnit}
            aria-label="Previous"
            className="px-1 text-[1.5rem] font-semibold"
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
            className="font-semibold text-base px-2 py-1 border-none outline-none shadow-none bg-transparent"
            aria-label="Jump to current week"
            style={{
              minWidth: 48,
              margin: "0 2px",
              cursor: "pointer",
              fontWeight: 700,
              background: "none",
              color: '#7C60F9',
              borderRadius: 0,
            }}
          >
            Week
          </button>
          <button
            type="button"
            onClick={nextUnit}
            aria-label="Next"
            className="px-1 text-[1.5rem] font-semibold"
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
