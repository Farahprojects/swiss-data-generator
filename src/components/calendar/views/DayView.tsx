
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";
import { formatClientNameForMobile } from "@/utils/clientsFormatters";

type ClientMap = Record<string, { id: string; name: string }>;
type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  clients?: ClientMap;
};
const TIMEBLOCKS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8:00-20:00
const DayView = ({ date, sessions, onSessionClick, clients = {} }: Props) => (
  <div className="border rounded bg-gray-100">
    <div className="flex flex-col min-h-[400px]">
      {TIMEBLOCKS.map(hr => {
        const events = sessions.filter(
          sess =>
            sess.start_time.getHours() === hr &&
            sess.start_time.toDateString() === date.toDateString()
        );
        return (
          <div key={hr} className="flex items-start gap-1 border-b px-2 py-2 bg-white">
            <div className="w-16 text-xs text-muted-foreground">{`${hr}:00`}</div>
            <div className="flex-1 flex gap-1">
              {events.map(sess => {
                let clientName: string | undefined;
                if (sess.client_id && clients[sess.client_id]) {
                  clientName = formatClientNameForMobile(clients[sess.client_id].name);
                }
                return (
                  <EventCard
                    key={sess.id}
                    session={sess}
                    onClick={() => onSessionClick(sess)}
                    isDetailed={false}
                    clientName={clientName}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
export default DayView;

