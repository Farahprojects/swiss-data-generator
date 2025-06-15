
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";
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
const MonthView = ({ date, sessions, onSessionClick, clients = {} }: Props) => {
  const grid = getMonthGrid(date);
  return (
    <div className="grid grid-cols-7 gap-[2px] border rounded overflow-hidden bg-gray-100">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
        <div className="py-1 px-2 text-xs font-semibold border-b bg-white" key={day}>{day}</div>
      ))}
      {grid.flat().map((d, i) => (
        <div key={i} className="min-h-[60px] bg-white border p-1 flex flex-col gap-1">
          {d && (
            <span
              className={`text-xs font-semibold ${d.getDate() === date.getDate() ? "text-primary" : ""}`}
            >
              {d.getDate()}
            </span>
          )}
          <div className="flex flex-col gap-1">
            {d &&
              sessions
                .filter(
                  event =>
                    event.start_time.toDateString() === d.toDateString()
                )
                .map(event => {
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
                })}
          </div>
        </div>
      ))}
    </div>
  );
};
export default MonthView;

