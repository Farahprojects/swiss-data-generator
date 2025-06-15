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

const getBackgroundForHour = (hr: number) => {
  if (hr < 9) return "bg-gradient-to-r from-sky-100 via-white to-sky-50"; // Early morning
  if (hr >= 9 && hr < 12) return "bg-gradient-to-r from-accent/60 via-white to-accent/40"; // Morning/business
  if (hr >= 12 && hr < 17) return "bg-gradient-to-r from-yellow-50 via-white to-yellow-100"; // Afternoon/business
  if (hr >= 17 && hr < 20) return "bg-gradient-to-r from-orange-50 via-white to-orange-100"; // Evening
  return "bg-muted";
};

const DayView = ({ date, sessions, onSessionClick, clients = {} }: Props) => {
  const now = new Date();
  const showCurrentTime = isToday(date);
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  // Compute "current time" slot Y position
  const slotHeight = 56; // px per slot (h-14), adjust if you change EmptySlot/EventCard heights

  return (
    <div className={`border rounded-lg shadow bg-gray-100 relative overflow-hidden ${isToday(date) ? "ring-2 ring-primary" : ""}`}>
      <div className="flex flex-col min-h-[400px] relative">
        {/* Current time indicator (spanning the whole height) */}
        {showCurrentTime && (
          <div
            className="absolute left-[72px] right-2 z-40 pointer-events-none"
            style={{
              top: ((currentHour - 8) * slotHeight + (currentMinutes / 60) * slotHeight) + "px",
              height: "2px",
            }}
          >
            <div className="flex items-center animate-pulse">
              <div className="h-2 w-2 bg-primary rounded-full shadow border-2 border-white" />
              <div className="flex-1 h-1 bg-primary opacity-90 rounded-full ml-2" />
            </div>
          </div>
        )}
        {TIMEBLOCKS.map((hr, idx) => {
          // Events starting at this hour/timeblock
          const events = sessions.filter(
            sess =>
              sess.start_time.getHours() === hr &&
              sess.start_time.toDateString() === date.toDateString()
          );
          // Business/after-hours background colors
          const isBusiness = hr >= BUSINESS_START && hr <= BUSINESS_END;
          const bgColor = getBackgroundForHour(hr);

          return (
            <div
              key={hr}
              className={`flex items-start gap-1 border-b px-2 py-0 ${bgColor} transition-all relative group ${isBusiness ? "shadow-xs" : ""}`}
              style={{ minHeight: slotHeight, position: "relative" }}
            >
              {/* Hour label with bold highlight for now */}
              <div className={`w-16 text-xs font-bold flex items-center justify-end select-none ${showCurrentTime && hr === currentHour ? "text-primary scale-110 animate-pulse" : "text-muted-foreground"}`}>
                {`${hr}:00`}
              </div>
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
                      onCreate={() => {}}
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
