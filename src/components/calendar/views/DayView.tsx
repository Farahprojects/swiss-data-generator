import React from "react";
import { CalendarSession } from "@/types/calendar";
import { EventCard } from "../EventCard";
import EmptySlot from "../EmptySlot";
import { formatClientNameForMobile } from "@/utils/clientsFormatters";

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
  const slotHeight = 40;

  return (
    <div className="rounded overflow-hidden bg-white">
      {/* Time slots */}
      <div className="flex flex-col min-h-[400px] relative">
        {TIMEBLOCKS.map((hr, idx) => {
          const events = sessions.filter(
            sess =>
              sess.start_time.getHours() === hr &&
              sess.start_time.toDateString() === date.toDateString()
          );
          const bgColor = "bg-white";

          return (
            <div
              key={hr}
              className={`flex items-stretch gap-1 px-2 py-0 ${bgColor} relative`}
              style={{ minHeight: slotHeight }}
            >
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
              <div className="w-16 flex items-center text-xs text-muted-foreground font-bold h-full">{`${hr}:00`}</div>
              <div className="flex-1 flex flex-row gap-2 overflow-x-auto items-stretch min-h-0">
                {events.length > 0
                  ? events.map(sess => {
                      let clientName: string | undefined;
                      if (sess.client_id && clients[sess.client_id]) {
                        clientName = formatClientNameForMobile(clients[sess.client_id].name);
                      }
                      return (
                        <div
                          className="flex-1 min-w-[240px] max-w-full"
                          key={sess.id}
                          style={{ display: "flex", alignItems: "stretch" }}
                        >
                          <EventCard
                            session={sess}
                            onClick={() => onSessionClick(sess)}
                            clientName={clientName}
                            isDetailed={true}
                            compact={true}
                          />
                        </div>
                      );
                    })
                  : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;
