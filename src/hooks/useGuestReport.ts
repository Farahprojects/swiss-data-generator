
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GuestReport {
  id: string;
  email: string;
  has_report_log?: boolean | null;
  is_ai_report?: boolean | null;
  translator_log_id?: string | null;
  report_log_id?: string | null;
  payment_status: string;
  created_at: string;
  stripe_session_id: string;
  report_type?: string | null;
  swiss_boolean?: boolean | null;
  has_swiss_error?: boolean | null;
  email_sent?: boolean;
  modal_ready?: boolean | null;
}

export const useGuestReport = (guestReportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report', guestReportId],
    queryFn: async (): Promise<GuestReport | null> => {
      if (!guestReportId) return null;

      const { data, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestReportId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!guestReportId,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    retry: 2,
  });
};
