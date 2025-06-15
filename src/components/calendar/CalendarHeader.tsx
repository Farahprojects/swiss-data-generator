
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  view: "month" | "week" | "day";
  setView: (view: "month" | "week" | "day") => void;
  onAddSession: () => void;
  today: Date;
  setToday: (date: Date) => void;
  isMobile?: boolean;
};

// Helper to get the week start and end dates
function getWeekRangeString(date: Date): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  // Short month if same, otherwise both months
  const format = (dt: Date) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (start.getMonth() === end.getMonth()) {
    return `${format(start)} - ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${format(start)} - ${format(end)}, ${end.getFullYear()}`;
}

export const CalendarHeader = ({
  view,
  setView,
  onAddSession,
  today,
  setToday,
  isMobile = false,
}: Props) => {
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

  // Allows user to click the week range for fast jump to current week
  function handleWeekClick() {
    const now = new Date();
    setToday(now);
  }

  return (
    <div className="flex flex-col items-center gap-0 mb-4">
      {/* Navigation and week range */}
      <div className="flex items-center gap-2 justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevUnit}
          aria-label="Previous"
        >
          &lt;
        </Button>
        {/* Clickable week range, styled in theme color */}
        <button
          type="button"
          onClick={handleWeekClick}
          className="mx-2 px-3 py-1 rounded-full font-semibold transition-colors focus:outline-none"
          style={{
            color: "var(--primary, #6951f3)",
            border: "2px solid #6951f3",
            background: "rgba(105,81,243,0.08)",
            boxShadow: "0 0 0 1px #6951f3 inset",
          }}
        >
          {getWeekRangeString(today)}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextUnit}
          aria-label="Next"
        >
          &gt;
        </Button>
      </div>

      {/* + Add Session button */}
      <div className="w-full flex justify-center mt-3">
        <Button onClick={onAddSession} className="w-full sm:w-auto">
          + Add Session
        </Button>
      </div>
      {/* Remove client filter bar and view controls per user request */}
    </div>
  );
};
