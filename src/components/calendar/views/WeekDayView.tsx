
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";

// Returns array of 7 Date objects representing Sun-Sat of the given week
function getWeekDates(refDate: Date) {
  const start = new Date(refDate);
  start.setDate(refDate.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return [...Array(7)].map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
};

export default function WeekDayView({
  date,
  sessions,
  onSessionClick,
}: Props) {
  const days = getWeekDates(date);

  return (
    <div className="border rounded bg-gray-100 overflow-x-auto">
      {/* Days of week header */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => (
          <div
            key={day.toISOString()}
            className="p-2 text-xs font-semibold text-center bg-white border-b"
            style={{
              color: day.toDateString() === new Date().toDateString() ? "#2563eb" : undefined,
            }}
          >
            <div>
              {day.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div className="text-xs">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>
      {/* Sessions for each day */}
      <div className="grid grid-cols-7 min-h-[200px]">
        {days.map(day => (
          <div
            key={day.toISOString()}
            className="border p-1 min-h-[120px] flex flex-col gap-1 bg-white overflow-x-auto"
          >
            {sessions
              .filter(sess => sess.start_time.toDateString() === day.toDateString())
              .map(sess => (
                <EventCard
                  key={sess.id}
                  session={sess}
                  onClick={() => onSessionClick(sess)}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
