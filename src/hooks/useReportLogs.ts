
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useReportLogs = (guestReportId: string | null) => {
  return useQuery({
    queryKey: ['report-logs', guestReportId],
    queryFn: async (): Promise<string | null> => {
      if (!guestReportId) return null;

      const { data, error } = await supabase
        .from('guest_reports')
        .select(`report_log_id, report_logs!inner(report_text)`)
        .eq('id', guestReportId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch report content: ${error.message}`);
      }

      return data?.report_logs?.report_text || null;
    },
    enabled: !!guestReportId,
    staleTime: 60_000, // Report content is relatively stable
  });
};
