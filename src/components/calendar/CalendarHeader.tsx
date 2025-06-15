
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  view: "month" | "week" | "day";
  setView: (view: "month" | "week" | "day") => void;
  onAddSession: () => void;
  today: Date;
  setToday: (date: Date) => void;
  clientFilterBar?: React.ReactNode;
};
export const CalendarHeader = ({
  view,
  setView,
  onAddSession,
  today,
  setToday,
  clientFilterBar,
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
  return (
    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 mb-4">
      <div className="flex gap-2">
        <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>Month</Button>
        <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>Week</Button>
        <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>Day</Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={prevUnit}>
          &lt;
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setToday(new Date())}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={nextUnit}>
          &gt;
        </Button>
      </div>
      <div className="flex-1">{clientFilterBar}</div>
      <Button onClick={onAddSession} className="w-full sm:w-auto" variant="primary">
        + Add Session
      </Button>
    </div>
  );
};
