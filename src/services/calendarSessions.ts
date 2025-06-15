
import { supabase } from "@/integrations/supabase/client";
import { CalendarSession, EventType } from "@/types/calendar";

// Helper to safely map DB row to CalendarSession
function mapRowToCalendarSession(s: any): CalendarSession {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    start_time: new Date(s.start_time),
    end_time: new Date(s.end_time),
    client_id: s.client_id ?? undefined,
    event_type: (s.event_type ?? "session") as EventType,
    color_tag: s.color_tag ?? undefined,
  };
}

// Service for CRUD calendar sessions
export const calendarSessionsService = {
  async getSessions(): Promise<CalendarSession[]> {
    const { data, error } = await supabase
      .from("calendar_sessions")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Convert ISO date strings to JS Date objects, handle nullables/types
    return (data || []).map(mapRowToCalendarSession);
  },

  async createSession(session: Omit<CalendarSession, "id">) {
    // Do not provide `coach_id` (RLS inserts automatically)
    // Convert Date to ISO strings for insert
    const payload: any = {
      ...session,
      start_time: session.start_time.toISOString(),
      end_time: session.end_time.toISOString(),
      // Pass null for client_id/color_tag if ""/undefined
      client_id: session.client_id || null,
      color_tag: session.color_tag || null,
      event_type: session.event_type ?? "session",
    };
    delete payload.id;
    // coach_id set by RLS

    const { data, error } = await supabase
      .from("calendar_sessions")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToCalendarSession(data);
  },

  async updateSession(id: string, updates: Partial<CalendarSession>) {
    // Convert any Dates to ISO for start_time/end_time
    const payload: any = { ...updates };
    if (payload.start_time instanceof Date)
      payload.start_time = payload.start_time.toISOString();
    if (payload.end_time instanceof Date)
      payload.end_time = payload.end_time.toISOString();

    // Remove id, coach_id from the payload (for RLS)
    delete payload.id;
    delete payload.coach_id;

    const { data, error } = await supabase
      .from("calendar_sessions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToCalendarSession(data);
  },

  async deleteSession(id: string) {
    const { error } = await supabase
      .from("calendar_sessions")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
