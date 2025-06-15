
import React, { useState } from "react";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useClientsData } from "@/hooks/useClientsData";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDaySelector } from "@/components/calendar/MobileDaySelector";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import CalendarView from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";

const CalendarPage: React.FC = () => {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [newEventDateTime, setNewEventDateTime] = useState<Date | null>(null);
  const isMobile = useIsMobile();

  // Selected day (for mobile day scrolling)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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

  // Fetch coach's actual clients
  const { clients, loading: clientsLoading } = useClientsData();

  // Transform client data to { id, name }
  const clientOptions = React.useMemo(() =>
    clients.map((c: any) => ({
      id: c.id,
      name: c.full_name || "Unnamed client",
    })), [clients]
  );

  // Create client map for easy lookup
  const clientMap = React.useMemo(() => {
    const map: Record<string, { id: string; name: string }> = {};
    clientOptions.forEach(c => { map[c.id] = c; });
    return map;
  }, [clientOptions]);

  function handleSaveSession(data: any, id?: string) {
    if (id) updateSession(id, data);
    else createSession(data);
  }

  function handleTimeSlotClick(date: Date, hour: number) {
    const eventDateTime = new Date(date);
    eventDateTime.setHours(hour, 0, 0, 0);
    setNewEventDateTime(eventDateTime);
    setEditing(null);
    setModalOpen(true);
  }

  function handleAddSession() {
    setEditing(null);
    setNewEventDateTime(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setNewEventDateTime(null);
    setEditing(null);
  }

  // Create initial event data based on clicked time slot or default
  const getInitialEventData = () => {
    if (newEventDateTime) {
      const endTime = new Date(newEventDateTime);
      endTime.setHours(newEventDateTime.getHours() + 1); // Default 1 hour duration
      return {
        title: "",
        description: "",
        start_time: newEventDateTime,
        end_time: endTime,
        client_id: "",
        event_type: "session" as const,
        color_tag: "#2563eb",
      };
    }
    return editing;
  };

  // Titles
  const mobileTitle = (
    <h1 className="text-xl font-bold mb-2 sm:hidden">Calendar</h1>
  );
  const desktopTitle = (
    <h1 className="hidden sm:block text-2xl md:text-3xl font-bold mb-2">
      Calendar
    </h1>
  );

  return (
    <div className="max-w-6xl mx-auto p-2 py-6 flex flex-col">
      {mobileTitle}
      {desktopTitle}
      <CalendarHeader
        view={view}
        setView={setView}
        onAddSession={handleAddSession}
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
            setModalOpen(true);
          }}
          onMoveSession={moveSession}
          isMobile={isMobile}
          setSelectedDay={isMobile ? setSelectedDay : undefined}
          clients={clientMap}
          onTimeSlotClick={handleTimeSlotClick}
        />
      </div>
      <EventModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveSession}
        initial={getInitialEventData()}
        clients={clientOptions}
        isMobile={isMobile}
      />
    </div>
  );
};

export default CalendarPage;
