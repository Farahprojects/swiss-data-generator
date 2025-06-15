
import React from "react";

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

  // Allows user to click "Week" to jump to current week
  function handleWeekClick() {
    setToday(new Date());
  }

  return (
    <div className="flex flex-col items-center gap-0 mb-4">
      <div className="flex items-center gap-4 justify-center">
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
          className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2 rounded font-semibold"
        >
          + Add Session
        </button>
      </div>
    </div>
  );
};
