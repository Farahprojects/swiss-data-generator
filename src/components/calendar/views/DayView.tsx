
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";
import EmptySlot from "../EmptySlot";
import { formatClientNameForMobile } from "@/utils/clientsFormatters";

// Highlight business hours 9-17 (inclusive), otherwise after-hours
const BUSINESS_START = 9, BUSINESS_END = 17;
const TIMEBLOCKS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8:00-20:00

type ClientMap = Record<string, { id: string; name: string }>;
type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  clients?: ClientMap;
};

const isToday = (date: Date) => {
  const now = new Date();
  return now.toDateString() === date.toDateString();
};

const DayView = ({ date, sessions, onSessionClick, clients = {} }: Props) => {
  const now = new Date();
  const showCurrentTime = isToday(date);
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  // Compact slot height for improved density
  const slotHeight = 40; // decreased from 56 for more density

  // Date header formatting
  const dayNum = date.getDate();
  const monthName = date.toLocaleString("default", { month: "short" });
  const weekdayName = date.toLocaleDateString(undefined, { weekday: "long" });

  return (
    <div className={`border rounded overflow-hidden ${
      isToday(date) ? "ring-2 ring-primary" : ""
    } bg-gray-100`}>
      {/* Date header */}
      <div className="flex items-center justify-center py-3 bg-white border-b relative">
        <div className="flex flex-col items-center">
          <span className={`text-3xl font-bold ${isToday(date) ? "text-primary" : ""}`}>
            {dayNum} <span className="text-base font-normal text-muted-foreground">{monthName}</span>
          </span>
          <span className={`text-sm font-semibold mt-1 ${isToday(date) ? "text-primary" : "text-muted-foreground"}`}>
            {weekdayName}
          </span>
        </div>
        {isToday(date) && (
          <span className="absolute right-4 top-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
            Today
          </span>
        )}
      </div>
      {/* Time slots */}
      <div className="flex flex-col min-h-[400px] relative">
        {TIMEBLOCKS.map((hr, idx) => {
          // Events starting at this hour/timeblock
          const events = sessions.filter(
            sess =>
              sess.start_time.getHours() === hr &&
              sess.start_time.toDateString() === date.toDateString()
          );
          // Business/after-hours background colors
          const isBusiness = hr >= BUSINESS_START && hr <= BUSINESS_END;
          const bgColor = isBusiness
            ? "bg-gradient-to-r from-white via-accent/60 to-white"
            : "bg-gradient-to-r from-muted via-accent/40 to-muted";

          return (
            <div key={hr} className={`flex items-stretch gap-1 border-b px-2 py-0 ${bgColor} relative`} style={{ minHeight: slotHeight }}>
              {/* Render current time indicator within the slot for today */}
              {showCurrentTime && idx === (currentHour - 8) && (
                <div
                  className="absolute left-0 right-0 top-0 z-10 flex items-center"
                  style={{
                    top: `${(currentMinutes / 60) * slotHeight}px`,
                    height: "2px",
                  }}
                >
                  <div className="h-2 w-2 bg-primary rounded-full shadow border border-white -ml-3" />
                  <div className="flex-1 h-1 bg-primary/80 opacity-80 rounded" />
                </div>
              )}
              {/* Time label */}
              <div className="w-16 flex items-center text-xs text-muted-foreground font-bold h-full">{`${hr}:00`}</div>
              {/* Events in one line (row) */}
              <div className="flex-1 flex flex-row gap-2 overflow-x-auto items-stretch min-h-0">
                {events.length > 0
                  ? events.map(sess => {
                    let clientName: string | undefined;
                    if (sess.client_id && clients[sess.client_id]) {
                      clientName = formatClientNameForMobile(clients[sess.client_id].name);
                    }
                    return (
                      <div className="flex-1 min-w-[140px] max-w-xs" key={sess.id} style={{ display: "flex", alignItems: "stretch" }}>
                        <EventCard
                          session={sess}
                          onClick={() => onSessionClick(sess)}
                          isDetailed={false}
                          clientName={clientName}
                        />
                      </div>
                    );
                  })
                  : (
                    <div className="flex-1 flex items-stretch">
                      <EmptySlot
                        timeLabel={`${hr}:00`}
                        interactive={true}
                        onCreate={() => {
                          // Optionally: trigger create event modal with this start time
                        }}
                      />
                    </div>
                  )
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default DayView;
