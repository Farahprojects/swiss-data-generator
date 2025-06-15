
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "./EventCard";

type Props = {
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  selectedDay: Date;
};
const sortByTime = (a: CalendarSession, b: CalendarSession) =>
  a.start_time.getTime() - b.start_time.getTime();

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

const SessionCardsMobile = ({ sessions, onSessionClick, selectedDay }: Props) => {
  const filtered = sessions.filter(s => isSameDay(s.start_time, selectedDay));
  return (
    <div className="flex flex-col gap-2">
      {filtered.sort(sortByTime).map(session => (
        <EventCard
          key={session.id}
          session={session}
          isDetailed
          onClick={() => onSessionClick(session)}
        />
      ))}
      {filtered.length === 0 && (
        <p className="text-center py-8">No sessions for this day.</p>
      )}
    </div>
  );
};

export default SessionCardsMobile;
