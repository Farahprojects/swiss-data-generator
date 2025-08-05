-- Enable realtime for guest_reports table
ALTER TABLE guest_reports REPLICA IDENTITY FULL;

-- Add guest_reports to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE guest_reports;