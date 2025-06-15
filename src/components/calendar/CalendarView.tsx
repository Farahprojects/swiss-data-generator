
import React from "react";
import { CalendarSession } from "@/types/calendar";
import WeekDayView from "./views/WeekDayView";

type Props = {
  date: Date;
  sessions: CalendarSession[];
  onSessionClick: (session: CalendarSession) => void;
  onMoveSession: (id: string, newStart: Date, newEnd: Date) => void;
  isMobile: boolean;
};

export const CalendarView = ({
  date,
  sessions,
  onSessionClick,
  onMoveSession,
  isMobile,
}: Props) => {
  // Always show the new WeekDayView
  return (
    <WeekDayView
      date={date}
      sessions={sessions}
      onSessionClick={onSessionClick}
    />
  );
};

export default CalendarView;
