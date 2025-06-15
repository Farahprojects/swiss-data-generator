
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { formatClientNameForMobile } from "@/utils/clientsFormatters";

type ClientMap = Record<string, { id: string; name: string }>;

type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  clients?: ClientMap;
};

// Time configuration
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const HOUR_HEIGHT = 60; // pixels per hour
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// Utility functions for event positioning
function getEventTop(startTime: Date): number {
  const hour = startTime.getHours();
  const minutes = startTime.getMinutes();
  return (hour - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
}

function getEventHeight(startTime: Date, endTime: Date): number {
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20); // minimum 20px height
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCurrentTimeTop(): number {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  if (hour < START_HOUR || hour >= END_HOUR) return -1; // Not visible
  return (hour - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export default function ProfessionalWeekView({ 
  date, 
  sessions, 
  onSessionClick, 
  onTimeSlotClick,
  clients = {} 
}: Props) {
  const startOfWeek = getStartOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const currentTimeTop = getCurrentTimeTop();
  const showCurrentTime = currentTimeTop >= 0;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b bg-gray-50">
        <div className="w-20 p-2"></div> {/* Empty corner for time axis */}
        {days.map((day) => (
          <div 
            key={day.toISOString()} 
            className={`p-3 text-center border-l ${isToday(day) ? 'bg-blue-50 text-blue-600 font-semibold' : ''}`}
          >
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              {day.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div className={`text-lg ${isToday(day) ? 'font-bold' : 'font-medium'}`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid container */}
      <div className="relative">
        <div className="grid grid-cols-8" style={{ minHeight: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
          {/* Time axis */}
          <div className="w-20 border-r bg-gray-50">
            {HOURS.map((hour) => (
              <div 
                key={hour} 
                className="relative border-b text-xs text-gray-600 pr-2 text-right"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <div className="absolute -top-2 right-2">
                  {formatHour(hour)}
                </div>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const daysSessions = sessions.filter(
              session => session.start_time.toDateString() === day.toDateString()
            );

            return (
              <div 
                key={day.toISOString()} 
                className={`relative border-l ${isToday(day) ? 'bg-blue-25' : ''} ${dayIndex === 6 ? 'bg-gray-25' : ''}`}
              >
                {/* Hour slots for click-to-create */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onClick={() => {
                      if (onTimeSlotClick) {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, 0, 0, 0);
                        onTimeSlotClick(slotDate, hour);
                      }
                    }}
                  >
                    {/* 30-minute line */}
                    <div 
                      className="absolute w-full border-t border-gray-200"
                      style={{ top: `${HOUR_HEIGHT / 2}px` }}
                    />
                  </div>
                ))}

                {/* Events */}
                {daysSessions.map((session) => {
                  const top = getEventTop(session.start_time);
                  const height = getEventHeight(session.start_time, session.end_time);
                  
                  // Skip events outside visible hours
                  if (session.start_time.getHours() < START_HOUR || session.start_time.getHours() >= END_HOUR) {
                    return null;
                  }

                  let clientName: string | undefined;
                  if (session.client_id && clients[session.client_id]) {
                    clientName = formatClientNameForMobile(clients[session.client_id].name);
                  }

                  return (
                    <div
                      key={session.id}
                      className="absolute left-1 right-1 bg-white border-l-4 shadow-sm rounded-r-md px-2 py-1 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                        borderLeftColor: session.color_tag || "#3b82f6",
                        minHeight: '20px'
                      }}
                      onClick={() => onSessionClick(session)}
                    >
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {session.title}
                      </div>
                      {clientName && height > 30 && (
                        <div className="text-xs text-gray-600 truncate">
                          {clientName}
                        </div>
                      )}
                      {height > 50 && (
                        <div className="text-xs text-gray-500">
                          {session.start_time.toLocaleTimeString([], { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Current time indicator */}
        {showCurrentTime && (
          <div 
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ top: `${currentTimeTop}px` }}
          >
            <div className="flex items-center">
              <div className="w-20 text-right pr-2">
                <div className="bg-red-500 text-white text-xs px-1 rounded">
                  {new Date().toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
              <div className="flex-1 h-0.5 bg-red-500"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
