import React, { useState } from "react";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useClientsData } from "@/hooks/useClientsData";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import CalendarView from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";
import { DaySessionsModal } from "@/components/calendar/DaySessionsModal"; // NEW


const CalendarPage: React.FC = () => {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [newSessionDate, setNewSessionDate] = useState<Date | null>(null);
  const isMobile = useIsMobile();

  // Selected day (for mobile day scrolling)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // New: Day session modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

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

  const { clients } = useClientsData();

  const clientOptions = React.useMemo(
    () =>
      clients.map((c: any) => ({
        id: c.id,
        name: c.full_name || "Unnamed client",
      })),
    [clients]
  );

  const clientMap = React.useMemo(() => {
    const map: Record<string, { id: string; name: string }> = {};
    clientOptions.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clientOptions]);

  function handleSaveSession(data: any, id?: string) {
    if (id) updateSession(id, data);
    else createSession(data);
  }

  function handleDeleteSession(id: string) {
    deleteSession(id);
    setModalOpen(false);
    setEditing(null);
  }

  // ------------------------
  // Month grid day click logic
  function handleDayClick(day: Date) {
    // Find all sessions for this day
    const sessionsForDay = sessions.filter(
      (s) => s.start_time.toDateString() === day.toDateString()
    );
    if (sessionsForDay.length > 0) {
      setDayModalDate(day);
      setDayModalOpen(true);
    } else {
      setEditing(null);
      setNewSessionDate(day);
      setModalOpen(true);
    }
  }

  function handleOpenEditSessionFromDayModal(session: any) {
    setDayModalOpen(false);
    setEditing(session);
    setNewSessionDate(null);
    setModalOpen(true);
  }

  function handleOpenAddSessionFromDayModal() {
    setDayModalOpen(false);
    setEditing(null);
    setNewSessionDate(dayModalDate);
    setModalOpen(true);
  }

  // ------------------------

  return (
    <div className="max-w-6xl mx-auto p-2 py-6 flex flex-col">{/* removed mt-16 since no navigation */}
        <CalendarHeader
        view={view}
        setView={setView}
        onAddSession={() => {
          setEditing(null);
          setNewSessionDate(null);
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
          sessions={sessions}
          onSessionClick={session => {
            setEditing(session);
            setNewSessionDate(null);
            setModalOpen(true);
          }}
          onMoveSession={moveSession}
          isMobile={isMobile}
          setSelectedDay={isMobile ? setSelectedDay : undefined}
          clients={clientMap}
          onDayClick={handleDayClick}
        />
      </div>
      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
        initial={editing}
        clients={clientOptions}
        isMobile={isMobile}
        initialDate={editing ? undefined : newSessionDate || undefined}
      />

      {/* NEW: DaySessionsModal */}
      {dayModalDate && (
        <DaySessionsModal
          open={dayModalOpen}
          onClose={() => setDayModalOpen(false)}
          date={dayModalDate}
          sessions={sessions.filter(
            (s) => s.start_time.toDateString() === dayModalDate.toDateString()
          )}
          clients={clientOptions}
          isMobile={isMobile}
          onEditSession={handleOpenEditSessionFromDayModal}
          onAddSession={handleOpenAddSessionFromDayModal}
        />
      )}
      </div>
  );
};
export default CalendarPage;
