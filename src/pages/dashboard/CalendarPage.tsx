import React, { useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useClientsData } from "@/hooks/useClientsData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import CalendarView from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";
import { DaySessionsModal } from "@/components/calendar/DaySessionsModal";
import { Button } from "@/components/ui/button";
import { MessageSquare, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Lazy load the sidebar controls
const ChatSidebarControls = lazy(() => import('@/features/chat/ChatSidebarControls').then(module => ({ default: module.ChatSidebarControls })));


const CalendarPage: React.FC = () => {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [newSessionDate, setNewSessionDate] = useState<Date | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleChatClick = () => {
    navigate('/chat');
  };

  // ------------------------

  return (
    <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-screen">
      {/* Left Sidebar (Desktop) */}
      <div className="hidden md:flex w-64 border-r border-gray-100 flex-col bg-gray-50/50">
        <div className="p-4 h-full flex flex-col">
          {/* Chat Button for Desktop - Only for Auth Users */}
          {user && (
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={handleChatClick}
                className="w-full justify-start font-light text-sm"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </div>
          )}
          
          <div className="flex-1">
            <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
              <ChatSidebarControls />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-2 p-3 bg-white border-b border-gray-100 pt-safe">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 hover:bg-gray-100 rounded-md">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:max-w-xs p-0">
              <div className="p-4">
                <div className="mb-3">
                  <h2 className="text-lg font-light italic">Settings</h2>
                </div>
                {user && (
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      onClick={handleChatClick}
                      className="w-full justify-start font-light text-sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                )}
                <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                  <ChatSidebarControls />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="p-2 py-6 flex flex-col flex-1">
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
      </div>
    </div>
  );
};
export default CalendarPage;
