-- Add modal_ready field to guest_reports table for auto-triggering modal
ALTER TABLE public.guest_reports 
ADD COLUMN modal_ready boolean DEFAULT false;