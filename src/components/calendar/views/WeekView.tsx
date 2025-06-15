
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";
import EmptySlot from "../EmptySlot";
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
const isToday = (d: Date) => {
  const now = new Date();
  return now.toDateString() === d.toDateString();
};
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export default function WeekView({ date, sessions, onSessionClick, clients = {} }: Props) {
  const startOfWeek = getStartOfWeek(date);
  const days = [...Array(7)].map((_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
  const todayIdx = days.findIndex(isToday);

  return (
    <div className="border rounded bg-gray-100 overflow-x-auto">
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`py-1 px-2 text-xs font-bold text-center bg-white border-b select-none
              ${isToday(day) ? "bg-primary/10 text-primary border-primary border-b-2 shadow" : ""}
              ${isWeekend(day) ? "bg-accent/20" : ""}
            `}
          >
            {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[200px] relative">
        {/* Current time indicator LINE for today */}
        {todayIdx !== -1 && (
          <div
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{
              gridColumnStart: todayIdx + 1,
              gridColumnEnd: todayIdx + 2,
              zIndex: 10,
              height: `calc(((${new Date().getHours() - 8} + ${new Date().getMinutes()}/60) * 56px) + 40px)`, // rough Y
            }}
          >
            <div
              className="absolute left-4 right-4 top-0 flex items-center"
              style={{
                top: `calc(((${new Date().getHours() - 8} + ${new Date().getMinutes()}/60) * 56px))`,
                height: "2px",
              }}
            >
              <div className="h-2 w-2 bg-primary rounded-full border border-white shadow" />
              <div className="flex-1 h-1 bg-primary/80 opacity-80 rounded" />
            </div>
          </div>
        )}
        {days.map(day => {
          const dayIsToday = isToday(day);
          const dayIsWeekend = isWeekend(day);
          const dayBg = dayIsToday
            ? "bg-primary/5"
            : dayIsWeekend
            ? "bg-accent/20"
            : "bg-white";
          const daySessions = sessions.filter(sess => sess.start_time.toDateString() === day.toDateString());
          return (
            <div
              key={day.toISOString()}
              className={`border p-1 min-h-[120px] flex flex-col gap-1 transition ${dayBg} group relative`}
              style={{
                borderColor: dayIsToday ? "#6951f3" : undefined,
              }}
            >
              {daySessions.length === 0 ? (
                <EmptySlot
                  interactive={true}
                  onCreate={() => {
                    // To wire: pop event modal for this date
                  }}
                />
              ) : (
                daySessions.map(sess => {
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
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

