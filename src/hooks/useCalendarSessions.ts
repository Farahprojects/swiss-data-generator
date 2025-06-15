
import { useState } from "react";
import { CalendarSession, EventType } from "@/types/calendar";
import { v4 as uuidv4 } from "uuid";

// Some mock sample data:
const dummySessions: CalendarSession[] = [
  {
    id: uuidv4(),
    title: "Strategy Session with Jane",
    description: "90-min deep dive on business goals.",
    start_time: new Date(new Date().setHours(10, 0, 0, 0)),
    end_time: new Date(new Date().setHours(11, 30, 0, 0)),
    client_id: "client1",
    event_type: "session",
    color_tag: "#a5b4fc",
  },
  {
    id: uuidv4(),
    title: "Check-in: Dan",
    description: "Quick status check, review goals.",
    start_time: new Date(new Date().setHours(14, 0, 0, 0)),
    end_time: new Date(new Date().setHours(14, 25, 0, 0)),
    client_id: "client2",
    event_type: "check-in",
    color_tag: "#fef08a",
  },
];

export function useCalendarSessions() {
  const [sessions, setSessions] = useState<CalendarSession[]>(dummySessions);

  function createSession(event: Omit<CalendarSession, "id">) {
    setSessions((prev) => [
      ...prev,
      { ...event, id: uuidv4() }
    ]);
  }

  function updateSession(id: string, updates: Partial<CalendarSession>) {
    setSessions((prev) =>
      prev.map(session =>
        session.id === id ? { ...session, ...updates } : session
      )
    );
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter(session => session.id !== id));
  }

  // Simple drag-and-drop reschedule simulation
  function moveSession(id: string, newStart: Date, newEnd: Date) {
    updateSession(id, { start_time: newStart, end_time: newEnd });
  }

  return {
    sessions,
    createSession,
    updateSession,
    deleteSession,
    moveSession,
  };
}
