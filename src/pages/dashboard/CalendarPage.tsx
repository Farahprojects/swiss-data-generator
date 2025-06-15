import React, { useMemo, useState } from "react";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
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
  const [isMobile, setIsMobile] = useState(useIsMobile());

  // Listen for window resize to toggle mobile mode
  React.useEffect(() => {
    function handleResize() {
      setIsMobile(useIsMobile());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      />
      <div className="flex-1 w-full mt-2">
        <CalendarView
          view={view}
          date={currentDate}
          sessions={filteredSessions}
          onSessionClick={session => {
            setEditing(session);
            setModalOpen(true);
          }}
          onMoveSession={moveSession}
          isMobile={isMobile}
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
