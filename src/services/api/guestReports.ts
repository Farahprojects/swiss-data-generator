// src/services/api/guestReports.ts
import { supabase } from '@/integrations/supabase/client';

// Returns the pre-seeded message id array for a guest report (uuid)
export async function getGuestReportMessageIds(guestId: string): Promise<(string | number)[]> {
  const { data, error } = await supabase
    .from('guest_reports')
    .select('messages')
    .eq('id', guestId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const ids = Array.isArray(data?.messages) ? data!.messages : [];
  return ids as (string | number)[];
}


