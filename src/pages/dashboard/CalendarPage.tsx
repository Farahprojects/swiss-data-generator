
import React, { useState } from "react";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDaySelector } from "@/components/calendar/MobileDaySelector";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import CalendarView from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";

// Removed the demoClients and ClientFilter logic

const CalendarPage: React.FC = () => {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const isMobile = useIsMobile();

  // Selected day (for mobile day scrolling)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // When changing week, update selectedDay (mobile)
  React.useEffect(() => {
    if (isMobile) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const diff = selectedDay.getTime() - weekStart.getTime();
      if (diff < 0 || diff >= 7 * 24 * 60 * 60 * 1000) {
        setSelectedDay(weekStart);
      }
    }
    // eslint-disable-next-line
  }, [currentDate, isMobile]);

  const {
    sessions,
    createSession,
    updateSession,
    deleteSession,
    moveSession,
  } = useCalendarSessions();

  // Use all sessions; no filtering by client anymore
  const filteredSessions = sessions;

  function handleSaveSession(data: any, id?: string) {
    if (id) updateSession(id, data);
    else createSession(data);
  }

  // Titles
  const mobileTitle = (
    <h1 className="text-xl font-bold mb-2 sm:hidden">Calendar</h1>
  );
  const desktopTitle = (
    <h1 className="hidden sm:block text-2xl md:text-3xl font-bold mb-2">
      Coaching Calendar
    </h1>
  );

  return (
    <div className="max-w-6xl mx-auto p-2 py-6 flex flex-col">
      {mobileTitle}
      {desktopTitle}
      <CalendarHeader
        view={view}
        setView={setView}
        onAddSession={() => {
          setEditing(null);
          setModalOpen(true);
        }}
        today={currentDate}
        setToday={setCurrentDate}
        isMobile={isMobile}
      />
      <div className="flex-1 w-full mt-2">
        <CalendarView
          view={view}
          date={currentDate}
          selectedDay={isMobile ? selectedDay : undefined}
          sessions={filteredSessions}
          onSessionClick={session => {
            setEditing(session);
            setModalOpen(true);
          }}
          onMoveSession={moveSession}
          isMobile={isMobile}
          setSelectedDay={isMobile ? setSelectedDay : undefined}
        />
      </div>
      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSession}
        initial={editing}
        clients={[]} // No clients filter now
        isMobile={isMobile}
      />
    </div>
  );
};
export default CalendarPage;
