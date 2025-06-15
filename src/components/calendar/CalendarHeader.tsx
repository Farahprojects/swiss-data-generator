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

  // For optional: Format "Week of 15 Jun, 2025"
  // const weekOfString = `Week of ${today.toLocaleDateString(undefined, {day:"numeric", month:"short", year:"numeric"})}`;

  return (
    <div className="flex flex-col items-center gap-0 mb-4">
      {/* Navigation and week label */}
      <div className="flex items-center gap-2 justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevUnit}
          aria-label="Previous"
        >
          &lt;
        </Button>
        {/* Clickable "Week" pill, styled in theme color */}
        <button
          type="button"
          onClick={handleWeekClick}
          className="mx-2 px-6 py-2 rounded-full font-bold text-lg transition-colors select-none"
          style={{
            // Use your ref image's light purple and border
            color: "#241783",
            border: "3px solid #7C60F9", // theme border
            background: "#F6F4FF", // matching your light purple bg
            boxShadow: "0 0 0 1.5px #7C60F9 inset",
          }}
        >
          Week
          {/* Optionally use this line for "Week of ..." display instead:
              {weekOfString}
          */}
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
      {/* No client filter or view controls */}
    </div>
  );
};
