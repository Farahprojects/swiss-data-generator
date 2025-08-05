-- Re-enable realtime for guest_reports table for WebSocket functionality
ALTER TABLE guest_reports REPLICA IDENTITY FULL;

-- Add guest_reports back to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE guest_reports; 