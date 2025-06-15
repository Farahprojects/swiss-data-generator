
import React from "react";

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
  // ----- MONTH SELECTOR LOGIC -----
  function handleMonthChange(offset: number) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + offset);
    setToday(d);
  }

  function handleMonthClick() {
    const now = new Date();
    // jump to first of current month
    setToday(new Date(now.getFullYear(), now.getMonth(), today.getDate()));
  }

  // ----- EXISTING NAVIGATION -----
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

  function handleWeekClick() {
    setToday(new Date());
  }

  // ----- MONTH DISPLAY -----
  const monthDisplay = (
    <div className="flex items-center justify-center gap-1 select-none mb-2 w-full">
      <button
        type="button"
        onClick={() => handleMonthChange(-1)}
        aria-label="Previous month"
        className="px-1 text-[1.7rem] font-bold"
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
      <span
        onClick={handleMonthClick}
        className="mx-2 font-semibold text-lg cursor-pointer"
        style={{
          color: "#241783",
          background: "none",
        }}
        aria-label="Jump to current month"
        tabIndex={0}
        role="button"
        onKeyPress={e => {
          if (e.key === "Enter" || e.key === " ") {
            handleMonthClick();
          }
        }}
      >
        {monthNames[today.getMonth()]} {today.getFullYear()}
      </span>
      <button
        type="button"
        onClick={() => handleMonthChange(1)}
        aria-label="Next month"
        className="px-1 text-[1.7rem] font-bold"
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
  );

  return (
    <div className="flex flex-col items-center gap-0 mb-4 w-full">
      {/* MONTH SELECTOR always shown */}
      {monthDisplay}
      {/* Desktop: nav + session button on right */}
      <div className="hidden sm:flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
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
      {/* Mobile: nav+label, then wide "+ Session" below */}
      <div className="flex sm:hidden flex-col w-full items-center">
        <div className="flex items-center gap-4 justify-center w-full">
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
