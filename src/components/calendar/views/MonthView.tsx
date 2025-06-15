import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";
import EmptySlot from "../EmptySlot";
import { formatClientNameForMobile } from "@/utils/clientsFormatters";

// Extended Props to accept clients map
type ClientMap = Record<string, { id: string; name: string }>;
type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  clients?: ClientMap;
};
const getMonthGrid = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDayIdx = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Start from Sunday
  const calendar = [];
  let day = 1 - startDayIdx;
  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      const d = new Date(year, month, day);
      week.push(day > 0 && day <= daysInMonth ? d : null);
      day++;
    }
    calendar.push(week);
  }
  return calendar;
};
const isToday = (d: Date) => {
  const now = new Date();
  return d?.toDateString() === now.toDateString();
};
const isWeekend = (d: Date) => d?.getDay() === 0 || d?.getDay() === 6;

const getCellClasses = (d: Date | null, dayIsToday: boolean, dayIsWeekend: boolean) => {
  let base = "min-h-[60px] border p-1 flex flex-col gap-1 relative transition rounded-lg";
  if (!d) {
    base += " bg-muted/40 opacity-40 border-dashed border-muted";
  } else if (dayIsToday) {
    base += " bg-primary/10 border-2 border-primary shadow-lg animate-pulse";
  } else if (dayIsWeekend) {
    base += " bg-accent/30";
  } else {
    base += " bg-white";
  }
  return base;
};

const MonthView = ({ date, sessions, onSessionClick, clients = {} }: Props) => {
  const grid = getMonthGrid(date);
  return (
    <div className="grid grid-cols-7 gap-[2px] border rounded-lg overflow-hidden bg-gray-100 shadow">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
        <div
          className="py-1 px-2 text-xs font-extrabold border-b bg-white text-center shadow-sm"
          key={day}
        >
          {day}
        </div>
      ))}
      {grid.flat().map((d, i) => {
        const dayIsToday = d && isToday(d);
        const dayIsWeekend = d && isWeekend(d);
        return (
          <div
            key={i}
            className={getCellClasses(d, !!dayIsToday, !!dayIsWeekend)}
            style={{ borderColor: dayIsToday ? "#6951f3" : undefined }}
          >
            {d && (
              <span
                className={`text-xs font-extrabold absolute left-2 top-1 z-10 p-1 rounded transition
                  ${dayIsToday ? "bg-primary text-white shadow" : ""}
                `}
              >
                {d.getDate()}
              </span>
            )}
            <div className="flex flex-col gap-1 mt-4">
              {d &&
                (() => {
                  const dayEvents =
                    sessions.filter(
                      event =>
                        event.start_time.toDateString() === d.toDateString()
                    ) ?? [];
                  if (dayEvents.length === 0) {
                    return (
                      <EmptySlot
                        interactive={true}
                        onCreate={() => {}}
                        timeLabel={undefined}
                      />
                    );
                  }
                  return dayEvents.map(event => {
                    let clientName: string | undefined;
                    if (event.client_id && clients[event.client_id]) {
                      clientName = formatClientNameForMobile(clients[event.client_id].name);
                    }
                    return (
                      <EventCard
                        key={event.id}
                        session={event}
                        onClick={() => onSessionClick(event)}
                        clientName={clientName}
                      />
                    );
                  });
                })()}
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default MonthView;
