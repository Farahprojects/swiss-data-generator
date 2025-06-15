import React, { useMemo, useState } from "react";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDaySelector } from "@/components/calendar/MobileDaySelector";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarView from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";
import { ClientFilter } from "@/components/calendar/ClientFilter";

const demoClients = [
  { id: "client1", name: "Jane Smith" },
  { id: "client2", name: "Dan Zhang" },
  { id: "client3", name: "Victoria Lee" },
];

// Quick utility to check mobile
function useIsMobile() {
  return window.innerWidth < 700;
}

const CalendarPage: React.FC = () => {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null); // session being edited
  const [clientFilter, setClientFilter] = useState("");
  const isMobile = useIsMobile();

  // Selected day for mobile view, defaults to currentDate at midnight
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // When changing week, reset selected day to Sunday of week
  React.useEffect(() => {
    if (isMobile) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      // If selectedDay not in current week, set to weekStart
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

  // Filtered sessions
  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        s => !clientFilter || s.client_id === clientFilter
      ),
    [sessions, clientFilter]
  );

  function handleSaveSession(data: any, id?: string) {
    if (id) updateSession(id, data);
    else createSession(data);
  }

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
        clientFilterBar={
          <ClientFilter
            clients={demoClients}
            value={clientFilter}
            setValue={setClientFilter}
          />
        }
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
        clients={demoClients}
        isMobile={isMobile}
      />
    </div>
  );
};
export default CalendarPage;
