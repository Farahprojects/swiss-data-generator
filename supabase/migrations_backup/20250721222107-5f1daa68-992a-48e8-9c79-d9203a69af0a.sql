
-- Create the missing trigger on guest_reports table to notify RCP orchestrator
CREATE TRIGGER trg_notify_orchestrator_on_guest_reports
  AFTER UPDATE ON public.guest_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_orchestrator();
