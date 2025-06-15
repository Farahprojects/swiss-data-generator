
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "./EventCard";

type Props = {
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
};
const sortByTime = (a: CalendarSession, b: CalendarSession) =>
  a.start_time.getTime() - b.start_time.getTime();

const SessionCardsMobile = ({ sessions, onSessionClick }: Props) => (
  <div className="flex flex-col gap-2">
    {sessions.sort(sortByTime).map(session => (
      <EventCard
        key={session.id}
        session={session}
        isDetailed
        onClick={() => onSessionClick(session)}
      />
    ))}
    {sessions.length === 0 && (
      <p className="text-center py-8">No sessions for this time period.</p>
    )}
  </div>
);

export default SessionCardsMobile;
