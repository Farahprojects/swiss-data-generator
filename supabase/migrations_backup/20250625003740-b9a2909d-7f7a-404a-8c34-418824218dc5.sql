
-- Add coach tracking columns to guest_reports table
ALTER TABLE public.guest_reports 
ADD COLUMN coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN coach_slug TEXT,
ADD COLUMN coach_name TEXT,
ADD COLUMN purchase_type TEXT DEFAULT 'report';

-- Make astrology-related fields nullable for coach reports
ALTER TABLE public.guest_reports 
ALTER COLUMN report_type DROP NOT NULL;

-- Add index for efficient coach queries
CREATE INDEX idx_guest_reports_coach_id ON public.guest_reports(coach_id);
CREATE INDEX idx_guest_reports_coach_slug ON public.guest_reports(coach_slug);
CREATE INDEX idx_guest_reports_purchase_type ON public.guest_reports(purchase_type);

-- Create policy for coaches to view their own guest reports
CREATE POLICY "coaches_view_own_guest_reports" ON public.guest_reports
  FOR SELECT
  USING (coach_id = auth.uid());
