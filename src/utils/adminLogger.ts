
import { supabase } from '@/integrations/supabase/client';

export const logToAdmin = async (
  page: string,
  eventType: string,
  message: string,
  meta?: any
) => {
  try {
    const { error } = await supabase.rpc('log_admin_event', {
      _page: page,
      _event_type: eventType,
      _logs: message,
      _user_id: null, // Guest submissions don't have user_id
      _meta: meta ? JSON.parse(JSON.stringify(meta)) : {}
    });

    if (error) {
      console.error('Failed to log to admin:', error);
    }
  } catch (err) {
    console.error('Error logging to admin:', err);
  }
};
