
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
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};
export default function WeekView({ date, sessions, onSessionClick, clients = {} }: Props) {
  const startOfWeek = getStartOfWeek(date);
  const days = [...Array(7)].map((_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
  return (
    <div className="border rounded bg-gray-100 overflow-x-auto">
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <div key={day.toISOString()} className="p-2 text-xs font-semibold text-center bg-white border-b">{day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[200px]">
        {days.map(day => (
          <div key={day.toISOString()} className="border p-1 min-h-[120px] flex flex-col gap-1 bg-white">
            {sessions
              .filter(sess => sess.start_time.toDateString() === day.toDateString())
              .map(sess => {
                let clientName: string | undefined;
                if (sess.client_id && clients[sess.client_id]) {
                  clientName = formatClientNameForMobile(clients[sess.client_id].name);
                }
                return (
                  <EventCard
                    key={sess.id}
                    session={sess}
                    onClick={() => onSessionClick(sess)}
                    clientName={clientName}
                  />
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

