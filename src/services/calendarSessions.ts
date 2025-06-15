
import { supabase } from "@/integrations/supabase/client";
import { CalendarSession } from "@/types/calendar";

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

    // Convert ISO date strings to JS Date objects
    return (data || []).map((s) => ({
      ...s,
      start_time: new Date(s.start_time),
      end_time: new Date(s.end_time),
    }));
  },

  async createSession(session: Omit<CalendarSession, "id">) {
    // Supabase RLS attaches coach_id automatically, but we pass it if needed
    const { data, error } = await supabase
      .from("calendar_sessions")
      .insert(session)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      start_time: new Date(data.start_time),
      end_time: new Date(data.end_time),
    };
  },

  async updateSession(id: string, updates: Partial<CalendarSession>) {
    const { data, error } = await supabase
      .from("calendar_sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      start_time: new Date(data.start_time),
      end_time: new Date(data.end_time),
    };
  },

  async deleteSession(id: string) {
    const { error } = await supabase
      .from("calendar_sessions")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
