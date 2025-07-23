
-- Create performance_timings table for measuring system bottlenecks
CREATE TABLE public.performance_timings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('verify_guest_payment', 'translator_edge')),
  guest_report_id UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_performance_timings_request_id ON public.performance_timings(request_id);
CREATE INDEX idx_performance_timings_stage ON public.performance_timings(stage);
CREATE INDEX idx_performance_timings_guest_report_id ON public.performance_timings(guest_report_id);
CREATE INDEX idx_performance_timings_created_at ON public.performance_timings(created_at);

-- Enable RLS (this is a temporary table for analysis)
ALTER TABLE public.performance_timings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access for edge functions
CREATE POLICY "service_role_manage_performance_timings" 
  ON public.performance_timings 
  FOR ALL 
  USING (true);
