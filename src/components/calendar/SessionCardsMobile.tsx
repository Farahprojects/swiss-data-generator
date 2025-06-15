
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "./EventCard";
import { isSameDay, sortByTime } from "@/utils/calendarHelpers";
import { formatClientNameForMobile } from "@/utils/clientsFormatters";

type ClientMap = Record<string, { id: string; name: string }>;

type Props = {
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  selectedDay: Date;
  clients?: ClientMap;
};

const SessionCardsMobile = ({
  sessions,
  onSessionClick,
  selectedDay,
  clients = {},
}: Props) => {
  const filtered = sessions.filter(s => isSameDay(s.start_time, selectedDay));
  return (
    <div className="flex flex-col gap-2">
      {filtered.sort(sortByTime).map(session => {
        let clientName;
        if (session.client_id && clients[session.client_id]) {
          clientName = formatClientNameForMobile(clients[session.client_id].name);
        }
        return (
          <EventCard
            key={session.id}
            session={session}
            isDetailed
            clientName={clientName}
            onClick={() => onSessionClick(session)}
          />
        );
      })}
      {filtered.length === 0 && (
        <p className="text-center py-8">No sessions for this day.</p>
      )}
    </div>
  );
};

export default SessionCardsMobile;
