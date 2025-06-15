
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

  // Allows user to click to jump to current week
  function handleWeekClick() {
    setToday(new Date());
  }

  return (
    <div className="flex flex-col items-center gap-0 mb-4">
      {/* Navigation and minimal week pill */}
      <div className="flex items-center gap-2 justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevUnit}
          aria-label="Previous"
        >
          &lt;
        </Button>
        {/* Minimal, elegant clickable week pill */}
        <button
          type="button"
          onClick={handleWeekClick}
          className="mx-2 px-8 py-2 rounded-full font-semibold text-xl transition-colors select-none border"
          style={{
            borderColor: "#7C60F9",
            background: "#F6F4FF",
            color: "#241783",
            fontWeight: 700,
            borderWidth: 2,
            boxShadow: "none",
            letterSpacing: 0.2,
          }}
        >
          Week
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
