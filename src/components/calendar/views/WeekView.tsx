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

function getBackgroundForHour(hour: number) {
  if (hour < 9) return "bg-gradient-to-b from-sky-100 via-white to-sky-50";
  if (hour >= 9 && hour < 12) return "bg-gradient-to-b from-accent/60 via-white to-accent/40";
  if (hour >= 12 && hour < 17) return "bg-gradient-to-b from-yellow-50 via-white to-yellow-100";
  if (hour >= 17 && hour < 20) return "bg-gradient-to-b from-orange-50 via-white to-orange-100";
  return "bg-muted";
}

export default function WeekView({ date, sessions, onSessionClick, clients = {} }: Props) {
  const startOfWeek = getStartOfWeek(date);
  const days = [...Array(7)].map((_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
  const todayIdx = days.findIndex(isToday);

  // Hour blocks for vertical alignment (8AM-8PM)
  const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i);

  return (
    <div className="border rounded-lg shadow bg-gray-100 overflow-x-auto">
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayIsToday = isToday(day);
          const dayIsWeekend = isWeekend(day);
          return (
            <div
              key={day.toISOString()}
              className={`py-1 px-2 text-xs font-extrabold text-center border-b select-none 
                ${dayIsToday ? "bg-primary/10 text-primary border-primary border-b-2 shadow-md" : ""}
                ${dayIsWeekend ? "bg-accent/20" : "bg-white"}
                transition-all`}
            >
              <span className="text-lg font-semibold">{day.getDate()}</span>
              <br />
              <span className="uppercase font-normal">{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
            </div>
          );
        })}
      </div>
      <div className="relative min-h-[600px]">
        {/* Current time indicator (vertical) */}
        {todayIdx !== -1 && (
          <div
            className="absolute pointer-events-none z-40"
            style={{
              gridColumnStart: todayIdx + 1,
              gridColumnEnd: todayIdx + 2,
              left: `calc((100% / 7) * ${todayIdx})`,
              right: 0,
              top: ((new Date().getHours() - 8) * 56 + (new Date().getMinutes() / 60) * 56) + 40 + "px",
              height: "2px",
              width: `calc(100% / 7 - 1.5px)`,
            }}
          >
            <div className="absolute left-4 right-4 top-0 flex items-center animate-pulse" style={{ height: "2px" }}>
              <div className="h-2 w-2 bg-primary rounded-full border-2 border-white shadow" />
              <div className="flex-1 h-1 bg-primary opacity-90 rounded-full" />
            </div>
          </div>
        )}
        {/* Hour/Day cells grid */}
        <div className="grid grid-cols-7">
          {days.map((day, colIdx) => {
            const dayIsToday = isToday(day);
            const dayIsWeekend = isWeekend(day);
            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col min-h-[716px] border-r border-muted relative ${dayIsToday ? "ring-2 ring-primary/60" : ""} ${dayIsWeekend ? "bg-accent/10" : "bg-white"}`}
              >
                {HOURS.map(hr => {
                  const daySessions = sessions.filter(sess =>
                    sess.start_time.toDateString() === day.toDateString() &&
                    sess.start_time.getHours() === hr
                  );
                  const isCurrentHour = dayIsToday && hr === new Date().getHours();
                  return (
                    <div
                      key={hr}
                      className={`px-1 py-0 border-b ${getBackgroundForHour(hr)} min-h-[56px] flex gap-1 items-center group transition-all relative ${isCurrentHour ? "bg-primary/10 animate-pulse" : ""}`}
                    >
                      {/* Show hour labels only at left edge */}
                      {colIdx === 0 && (
                        <span className={`absolute -left-10 text-xs font-bold text-muted-foreground ${isCurrentHour ? "text-primary scale-110" : ""}`}>
                          {hr}:00
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        {daySessions.length === 0 ? (
                          <EmptySlot
                            interactive={true}
                            onCreate={() => {}}
                            timeLabel={undefined}
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
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
