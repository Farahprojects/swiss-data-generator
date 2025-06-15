
import React from "react";
import { CalendarSession } from "@/types/calendar";
import MonthView from "./views/MonthView";
import WeekView from "./views/WeekView";
import DayView from "./views/DayView";
import SessionCardsMobile from "./SessionCardsMobile";
import { MobileDaySelector } from "./MobileDaySelector";

type ClientMap = Record<string, { id: string; name: string }>;

type Props = {
  view: "month" | "week" | "day";
  date: Date;
  selectedDay?: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  isMobile: boolean;
  setSelectedDay?: (date: Date) => void;
  clients?: ClientMap;
};

export const CalendarView = ({
  view,
  date,
  selectedDay,
  sessions,
  onSessionClick,
  onMoveSession,
  isMobile,
  setSelectedDay,
  clients,
}: Props) => {
  if (isMobile && selectedDay && setSelectedDay) {
    return (
      <div>
        <MobileDaySelector
          weekDate={date}
          selectedDay={selectedDay}
          onSelect={setSelectedDay}
          sessions={sessions}
        />
        <SessionCardsMobile
          sessions={sessions}
          onSessionClick={onSessionClick}
          selectedDay={selectedDay}
          clients={clients}
        />
      </div>
    );
  }
  if (view === "month")
    return <MonthView date={date} sessions={sessions} onSessionClick={onSessionClick} clients={clients} />;
  if (view === "week")
    return (
      <WeekView
        date={date}
        sessions={sessions}
        onSessionClick={onSessionClick}
        onMoveSession={onMoveSession}
        clients={clients}
      />
    );
  return (
    <DayView
      date={date}
      sessions={sessions}
      onSessionClick={onSessionClick}
      onMoveSession={onMoveSession}
      clients={clients}
    />
  );
};
export default CalendarView;

