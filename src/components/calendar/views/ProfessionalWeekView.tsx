
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, startOfWeek, addDays, isToday, getDay, addMinutes, startOfDay, isSameWeek } from 'date-fns';
import { CalendarSession } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

type ClientMap = Record<string, { id: string; name: string }>;
type Props = {
  date: Date;
  sessions: CalendarSession[];
  clients?: ClientMap;
  onSessionClick: (session: CalendarSession) => void;
  onTimeSlotClick: (date: Date) => void;
};

const HOUR_HEIGHT = 60; // pixels per hour
const HOURS_TO_SHOW = Array.from({ length: 24 }, (_, i) => i);

const topPosition = (time: Date) => {
    const minutes = time.getHours() * 60 + time.getMinutes();
    return (minutes / 60) * HOUR_HEIGHT;
};

const durationHeight = (start: Date, end: Date) => {
    const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / (1000 * 60)); // Min height for 15 mins
    return (durationMinutes / 60) * HOUR_HEIGHT;
};

const ProfessionalWeekView: React.FC<Props> = ({ date, sessions, clients, onSessionClick, onTimeSlotClick }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => startOfWeek(date, { weekStartsOn: 0 }), [date]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Scroll to 8 AM on mount
    if (scrollerRef.current) {
        scrollerRef.current.scrollTop = 8 * HOUR_HEIGHT - HOUR_HEIGHT / 2;
    }
  }, []);

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>, dayDate: Date) => {
    if (!scrollerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollerRef.current.scrollTop;
    
    const totalHeight = HOUR_HEIGHT * 24;
    const minutesFromTop = (y / totalHeight) * 24 * 60;
    const clickedTime = addMinutes(startOfDay(dayDate), minutesFromTop);
    
    // Snap to nearest 15 minutes
    const minutes = clickedTime.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const finalTime = new Date(clickedTime);
    finalTime.setMinutes(roundedMinutes, 0, 0);

    onTimeSlotClick(finalTime);
  }, [onTimeSlotClick]);

  const timeIndicatorVisible = isSameWeek(currentTime, date, { weekStartsOn: 0 });
  
  return (
    <div className="flex flex-col bg-white rounded-lg shadow-lg border overflow-hidden" style={{ height: 'calc(100vh - 180px)'}}>
      {/* Header */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b shrink-0">
        <div className="text-xs font-medium text-center p-2 text-gray-400 border-r flex items-center justify-center">
            <Clock size={14} className="mr-1"/> Time
        </div>
        {days.map(day => (
          <div key={day.toISOString()} className="text-center p-2 border-r last:border-r-0">
            <p className="text-sm text-gray-500">{format(day, 'EEE')}</p>
            <p className={cn("text-2xl font-bold mt-1", isToday(day) ? 'bg-blue-600 text-white rounded-full w-9 h-9 flex items-center justify-center mx-auto' : '')}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" ref={scrollerRef}>
        <div className="grid grid-cols-[4rem_repeat(7,1fr)] relative">
          {/* Time Gutter */}
          <div className="col-start-1 col-end-2 border-r bg-gray-50">
            {HOURS_TO_SHOW.map(hour => (
              <div key={hour} className="h-[60px] relative text-right pr-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 -translate-y-1/2 absolute top-full right-2">
                  {hour < 23 ? format(new Date(0, 0, 0, hour + 1), "h aa") : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns for background and click handling */}
          {days.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              style={{ gridColumn: dayIndex + 2 }}
              className="col-start-auto border-r last:border-r-0 relative"
              onClick={(e) => handleGridClick(e, day)}
            >
              {HOURS_TO_SHOW.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-100"></div>
              ))}
            </div>
          ))}

          {/* Events Overlay */}
          <div className="col-start-2 col-end-9 row-start-1 row-end-2 grid grid-cols-7 h-full absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
            {sessions.map(session => {
                const dayIndex = getDay(session.start_time);
                return (
                    <div
                        key={session.id}
                        className="relative pointer-events-auto"
                        style={{ gridColumn: dayIndex + 1 }}
                    >
                         <div
                            className="absolute w-[calc(100%-8px)] left-[4px] rounded-lg p-2 text-white shadow-md cursor-pointer transition-all hover:shadow-lg flex flex-col overflow-hidden z-10"
                            style={{
                                top: `${topPosition(session.start_time)}px`,
                                height: `${durationHeight(session.start_time, session.end_time)}px`,
                                backgroundColor: session.color_tag || '#3b82f6',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSessionClick(session);
                            }}
                        >
                            <p className="font-bold text-xs truncate">{session.title}</p>
                            {clients?.[session.client_id || '']?.name && <p className="text-xs opacity-90 truncate">{clients?.[session.client_id || '']?.name}</p>}
                            <p className="text-[10px] opacity-80 mt-auto pt-1">
                                {format(session.start_time, 'p')} - {format(session.end_time, 'p')}
                            </p>
                        </div>
                    </div>
                );
            })}
          </div>

          {/* Current Time Indicator */}
          {timeIndicatorVisible && (
            <div
              className="absolute left-16 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ top: `${topPosition(currentTime)}px` }}
            >
                <div className="absolute -left-2 -top-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalWeekView;
