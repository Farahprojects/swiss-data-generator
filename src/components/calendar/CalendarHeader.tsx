
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  onAddSession: () => void;
  today: Date;
  setToday: (date: Date) => void;
  clientFilterBar?: React.ReactNode;
};

export const CalendarHeader = ({
  onAddSession,
  today,
  setToday,
  clientFilterBar,
}: Props) => {
  function nextWeek() {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    setToday(d);
  }
  function prevWeek() {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    setToday(d);
  }
  function goToday() {
    setToday(new Date());
  }

  const weekStr = (() => {
    // Display e.g. "Jun 17 - Jun 23, 2025"
    const start = new Date(today);
    start.setDate(today.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startFmt = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endFmt = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${startFmt} - ${endFmt}`;
  })();

  return (
    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 mb-4">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={prevWeek}>
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon" onClick={goToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ChevronRight />
        </Button>
        <span className="text-md font-semibold px-2">{weekStr}</span>
      </div>
      <div className="flex-1">{clientFilterBar}</div>
      <Button onClick={onAddSession} className="w-full sm:w-auto">
        + Add Session
      </Button>
    </div>
  );
};
