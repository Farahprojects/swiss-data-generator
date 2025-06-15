
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
  // Compute "current time" slot Y position
  const slotHeight = 56; // px per slot (h-14), adjust if you change EmptySlot/EventCard heights

  return (
    <div className={`border rounded overflow-hidden ${
      isToday(date) ? "ring-2 ring-primary" : ""
    } bg-gray-100`}>
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
            <div key={hr} className={`flex items-start gap-1 border-b px-2 py-0 ${bgColor} relative`} style={{ minHeight: slotHeight }}>
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
              <div className="w-16 text-xs text-muted-foreground font-bold">{`${hr}:00`}</div>
              <div className="flex-1 flex gap-1">
                {events.length > 0
                  ? events.map(sess => {
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
                  })
                  : (
                    <EmptySlot
                      timeLabel={`${hr}:00`}
                      interactive={true}
                      onCreate={() => {
                        // Optionally: trigger create event modal with this start time
                        // On integration, use a callback
                      }}
                    />
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

