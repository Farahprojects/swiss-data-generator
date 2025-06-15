
import React from "react";
import { CalendarSession } from "@/types/calendar";
import MonthView from "./views/MonthView";
import WeekView from "./views/WeekView";
import DayView from "./views/DayView";
import SessionCardsMobile from "./SessionCardsMobile";

type Props = {
  view: "month" | "week" | "day";
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  isMobile: boolean;
};
export const CalendarView = ({
  view,
  date,
  sessions,
  onSessionClick,
  onMoveSession,
  isMobile,
}: Props) => {
  if (isMobile) {
    return (
      <SessionCardsMobile
        sessions={sessions}
        onSessionClick={onSessionClick}
      />
    );
  }
  if (view === "month") return <MonthView date={date} sessions={sessions} onSessionClick={onSessionClick} />;
  if (view === "week") return <WeekView date={date} sessions={sessions} onSessionClick={onSessionClick} onMoveSession={onMoveSession} />;
  return <DayView date={date} sessions={sessions} onSessionClick={onSessionClick} onMoveSession={onMoveSession} />;
};
export default CalendarView;
