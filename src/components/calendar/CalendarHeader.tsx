
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

  return (
    <div className="flex flex-col items-center gap-0 mb-4 w-full">
      {/* Desktop: inline */}
      <div className="hidden sm:flex w-full items-center justify-between">
        <div className="flex items-center gap-1">
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
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={v => v && setView(v as "month" | "week" | "day")}
            className="ml-1 mr-1"
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
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={v => v && setView(v as "month" | "week" | "day")}
            className="ml-1 mr-1"
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
