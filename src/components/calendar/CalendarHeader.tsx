
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Props = {
  view: "month" | "week" | "day";
  setView: (view: "month" | "week" | "day") => void;
  onAddSession: () => void;
  today: Date;
  setToday: (date: Date) => void;
  isMobile?: boolean;
};

function formatPeriodLabel(today: Date, view: "month" | "week" | "day") {
  if (!today) return "";
  if (view === "day") {
    return today.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  if (view === "month") {
    return today.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  }
  if (view === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startDay = start.getDate();
    const startMonth = start.toLocaleString(undefined, { month: "short" });
    const endDay = end.getDate();
    const endMonth = end.toLocaleString(undefined, { month: "short" });
    const showYear = (start.getFullYear() !== end.getFullYear());
    if (startMonth === endMonth && !showYear) {
      return `${startMonth} ${startDay} – ${endDay}, ${start.getFullYear()}`;
    } else if (showYear) {
      return `${startMonth} ${startDay}, ${start.getFullYear()} – ${endMonth} ${endDay}, ${end.getFullYear()}`;
    } else {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${end.getFullYear()}`;
    }
  }
  return "";
}

export const CalendarHeader = ({
  view,
  setView,
  onAddSession,
  today,
  setToday,
  isMobile = false,
}: Props) => {
  function handleJumpToToday() {
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

  // Use CSS Grid for fixed, consistent positioning
  return (
    <div className="mb-4 w-full">
      {/* Calendar Title */}
      <div className="w-full flex flex-col items-center">
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl mb-1">Calendar</h1>
      </div>
      {/* Header controls on one row, fixed positions */}
      <div
        className="
          grid
          grid-cols-3
          items-center
          w-full
          gap-2
          mt-2
        "
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        {/* Left: Arrows + date label (fixed width on desktop) */}
        <div className="flex items-center justify-start min-w-[230px]">
          <button
            type="button"
            onClick={prevUnit}
            aria-label="Previous"
            className="text-primary-600 hover:bg-primary/10 p-2 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-base sm:text-lg md:text-xl font-semibold px-2 select-none min-w-[120px] text-center truncate" style={{ maxWidth: 180 }}>
            {formatPeriodLabel(today, view)}
          </span>
          <button
            type="button"
            onClick={nextUnit}
            aria-label="Next"
            className="text-primary-600 hover:bg-primary/10 p-2 rounded-full transition"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        {/* Center: View toggle */}
        <div className="flex items-center justify-center">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={v => v && setView(v as "month" | "week" | "day")}
            className="gap-2"
            size="sm"
          >
            <ToggleGroupItem
              value="month"
              aria-label="Month view"
              className="font-semibold text-base px-3 py-1 data-[state=on]:bg-primary/90 data-[state=on]:text-white"
              variant={view === "month" ? "default" : "outline"}
            >
              Month
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              aria-label="Week view"
              className="font-semibold text-base px-3 py-1 data-[state=on]:bg-primary/90 data-[state=on]:text-white"
              variant={view === "week" ? "default" : "outline"}
            >
              Week
            </ToggleGroupItem>
            <ToggleGroupItem
              value="day"
              aria-label="Day view"
              className="font-semibold text-base px-3 py-1 data-[state=on]:bg-primary/90 data-[state=on]:text-white"
              variant={view === "day" ? "default" : "outline"}
            >
              Day
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {/* Right: Add session button, always right-aligned */}
        <div className="flex items-center justify-end min-w-[134px]">
          <button
            onClick={onAddSession}
            className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold"
          >
            + Session
          </button>
        </div>
      </div>
    </div>
  );
};
