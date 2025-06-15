
import React, { useState, useEffect, useMemo } from "react";
import { CalendarSession } from "@/types/calendar";
import { format, startOfWeek, addDays, isSameDay, isToday, addMinutes } from "date-fns";
import { Clock, Plus } from "lucide-react";

type ClientMap = Record<string, { id: string; name: string }>;

type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  onCreateSession?: (date: Date, hour: number) => void;
  clients?: ClientMap;
};

// Time configuration
const START_HOUR = 7; // 7 AM
const END_HOUR = 20; // 8 PM
const HOUR_HEIGHT = 80; // pixels per hour
const MINUTES_PER_PIXEL = 60 / HOUR_HEIGHT;

// Generate time slots
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const time = new Date();
    time.setHours(hour, 0, 0, 0);
    slots.push({
      hour,
      time,
      label: format(time, hour === 12 ? "'12 PM'" : hour > 12 ? `'${hour - 12} PM'` : `'${hour} AM'`),
    });
  }
  return slots;
};

// Calculate event position and size
const getEventStyle = (session: CalendarSession, dayStart: Date) => {
  const startMinutes = (session.start_time.getHours() - START_HOUR) * 60 + session.start_time.getMinutes();
  const duration = (session.end_time.getTime() - session.start_time.getTime()) / (1000 * 60);
  
  return {
    top: `${startMinutes / MINUTES_PER_PIXEL}px`,
    height: `${Math.max(duration / MINUTES_PER_PIXEL, 30)}px`, // Minimum 30px height
  };
};

// Current time indicator
const CurrentTimeIndicator = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMinutes = (currentTime.getHours() - START_HOUR) * 60 + currentTime.getMinutes();
  const isVisible = currentTime.getHours() >= START_HOUR && currentTime.getHours() <= END_HOUR;

  if (!isVisible) return null;

  return (
    <div 
      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
      style={{ top: `${currentMinutes / MINUTES_PER_PIXEL}px` }}
    >
      <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg" />
      <div className="flex-1 h-0.5 bg-red-500" />
    </div>
  );
};

// Enhanced Event Card
const EventCard = ({ 
  session, 
  onClick, 
  clientName,
  style 
}: { 
  session: CalendarSession; 
  onClick: () => void; 
  clientName?: string; 
  style: React.CSSProperties;
}) => {
  const formatTime = (date: Date) => format(date, "h:mm a");
  
  return (
    <div
      onClick={onClick}
      className="absolute left-1 right-1 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group hover:scale-[1.02] z-10"
      style={{ 
        ...style,
        borderLeftColor: session.color_tag || "#3b82f6",
        backgroundColor: `${session.color_tag || "#3b82f6"}10`
      }}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        <div>
          <div className="font-semibold text-sm text-gray-900 truncate group-hover:text-gray-700">
            {session.title}
          </div>
          {clientName && (
            <div className="text-xs text-gray-600 truncate mt-0.5">
              {clientName}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <Clock size={10} />
          {formatTime(session.start_time)} - {formatTime(session.end_time)}
        </div>
      </div>
    </div>
  );
};

// Time Slot Component
const TimeSlot = ({ 
  hour, 
  day, 
  onCreateSession 
}: { 
  hour: number; 
  day: Date; 
  onCreateSession?: (date: Date, hour: number) => void; 
}) => {
  const handleClick = () => {
    if (onCreateSession) {
      onCreateSession(day, hour);
    }
  };

  return (
    <div 
      className="relative border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-150 group cursor-pointer"
      style={{ height: `${HOUR_HEIGHT}px` }}
      onClick={handleClick}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="bg-blue-500 text-white rounded-full p-1 shadow-lg">
          <Plus size={16} />
        </div>
      </div>
    </div>
  );
};

export const ProfessionalWeekView = ({
  date,
  sessions,
  onSessionClick,
  onMoveSession,
  onCreateSession,
  clients,
}: Props) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const timeSlots = generateTimeSlots();
  
  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      return {
        date: day,
        dayName: format(day, "EEE"),
        dayNumber: format(day, "d"),
        isToday: isToday(day),
        isWeekend: day.getDay() === 0 || day.getDay() === 6,
      };
    });
  }, [weekStart]);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const grouped: Record<string, CalendarSession[]> = {};
    
    weekDays.forEach(({ date }) => {
      const dateKey = format(date, "yyyy-MM-dd");
      grouped[dateKey] = sessions.filter(session => 
        isSameDay(session.start_time, date)
      );
    });
    
    return grouped;
  }, [sessions, weekDays]);

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="grid grid-cols-8 gap-0">
          {/* Time column header */}
          <div className="w-20 p-4 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-center justify-center h-8">
              <Clock className="text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Day headers */}
          {weekDays.map(({ date, dayName, dayNumber, isToday, isWeekend }) => (
            <div 
              key={format(date, "yyyy-MM-dd")}
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 transition-all duration-200 ${
                isToday 
                  ? "bg-gradient-to-b from-blue-50 to-blue-100 border-blue-200" 
                  : isWeekend
                  ? "bg-gradient-to-b from-gray-50 to-gray-100"
                  : "bg-gradient-to-b from-white to-gray-50 hover:from-gray-50 hover:to-gray-100"
              }`}
            >
              <div className={`font-bold text-lg ${
                isToday ? "text-blue-700" : isWeekend ? "text-gray-500" : "text-gray-700"
              }`}>
                {dayName}
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                isToday 
                  ? "text-blue-800 bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto shadow-lg" 
                  : isWeekend 
                  ? "text-gray-400" 
                  : "text-gray-600"
              }`}>
                {dayNumber}
              </div>
              {isToday && (
                <div className="text-xs text-blue-600 font-medium mt-1">TODAY</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          <div className="grid grid-cols-8 gap-0">
            {/* Time axis */}
            <div className="w-20 bg-white border-r border-gray-200">
              {timeSlots.map(({ hour, label }) => (
                <div 
                  key={hour}
                  className="relative border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <div className="absolute -top-3 left-2 text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded shadow-sm">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(({ date, isWeekend }) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const daySessions = sessionsByDay[dateKey] || [];
              
              return (
                <div 
                  key={dateKey}
                  className={`relative border-r border-gray-200 last:border-r-0 ${
                    isWeekend ? "bg-gray-50/50" : "bg-white"
                  }`}
                >
                  {/* Time slots for this day */}
                  {timeSlots.map(({ hour }) => (
                    <TimeSlot
                      key={hour}
                      hour={hour}
                      day={date}
                      onCreateSession={onCreateSession}
                    />
                  ))}

                  {/* Events for this day */}
                  {daySessions.map(session => {
                    const style = getEventStyle(session, date);
                    const clientName = session.client_id ? clients?.[session.client_id]?.name : undefined;
                    
                    return (
                      <EventCard
                        key={session.id}
                        session={session}
                        onClick={() => onSessionClick(session)}
                        clientName={clientName}
                        style={style}
                      />
                    );
                  })}

                  {/* Current time indicator */}
                  {isToday(date) && <CurrentTimeIndicator />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
