
-- Create a table for calendar sessions and relate them to coach and client
CREATE TABLE public.calendar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  client_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT DEFAULT 'session',
  color_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Foreign key to the auth.users table for coach
ALTER TABLE public.calendar_sessions
  ADD CONSTRAINT fk_coach_id FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Foreign key to clients table (optional, can be null for unassigned)
ALTER TABLE public.calendar_sessions
  ADD CONSTRAINT fk_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Enable RLS and allow only the coach to select/insert/update/delete their own events
ALTER TABLE public.calendar_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own sessions"
  ON public.calendar_sessions FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coach can insert sessions"
  ON public.calendar_sessions FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coach can update sessions"
  ON public.calendar_sessions FOR UPDATE
  USING (coach_id = auth.uid());

CREATE POLICY "Coach can delete own sessions"
  ON public.calendar_sessions FOR DELETE
  USING (coach_id = auth.uid());
