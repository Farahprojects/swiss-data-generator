
import React from "react";
import { CalendarSession } from "@/types/calendar";

// Dots will use color_tag, fallback is a nice color
const getDotColor = (tag?: string) => tag || "#a5b4fc";

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

const MonthView = ({ date, sessions, onSessionClick, clients = {} }: Props) => {
  const grid = getMonthGrid(date);
  return (
    <div className="grid grid-cols-7 gap-[2px] border rounded overflow-hidden bg-gray-100">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
        <div
          className="py-1 px-2 text-xs font-bold border-b bg-white text-center"
          key={day}
        >
          {day}
        </div>
      ))}
      {grid.flat().map((d, i) => {
        const dayIsToday = !!d && isToday(d);
        // All days have same white bg, except today
        const cellBg = dayIsToday
          ? "bg-primary/5"
          : "bg-white";
        // Find all events on this day
        const dayEvents = d
          ? sessions.filter(event => event.start_time.toDateString() === d.toDateString())
          : [];
        return (
          <div
            key={i}
            className={`min-h-[60px] ${cellBg} border p-1 flex flex-col gap-1 relative transition`}
            style={{ borderColor: dayIsToday ? "#6951f3" : undefined }}
          >
            {d && (
              <span
                className={`text-xs font-semibold absolute left-2 top-1 z-10 ${
                  dayIsToday ? "text-primary" : ""
                }`}
              >
                {d.getDate()}
              </span>
            )}
            {/* Instead of EmptySlot or EventCard, just show dots for each event */}
            <div className="flex flex-row flex-wrap gap-[4px] mt-5 ml-1">
              {dayEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onSessionClick(event)}
                  className="rounded-full border-2 border-white shadow focus:outline-none focus:ring-2 focus:ring-primary/60"
                  style={{
                    width: 14,
                    height: 14,
                    background: getDotColor(event.color_tag),
                  }}
                  title={event.title}
                  aria-label={event.title}
                  tabIndex={0}
                  type="button"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default MonthView;
