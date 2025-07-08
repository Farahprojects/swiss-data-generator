-- Check if there's a policy to allow guests to read report_logs
-- Add policy to allow reading report_logs via guest_reports join

CREATE POLICY "Allow guests to read their own report content" 
ON public.report_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.guest_reports 
    WHERE guest_reports.report_log_id = report_logs.id
  )
);