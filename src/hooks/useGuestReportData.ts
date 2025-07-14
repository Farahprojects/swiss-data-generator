import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuestReportData = (reportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report-data', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      
      console.log('[useGuestReportData] Fetching data for reportId:', reportId);
      
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { id: reportId }
      });
      
      if (error) {
        console.error('[useGuestReportData] Error from edge function:', error);
        throw error;
      }
      
      console.log('[useGuestReportData] Raw data received from edge function:', {
        hasData: !!data,
        reportContentFirst10: data?.report_content?.substring(0, 10),
        swissDataExists: !!data?.swiss_data,
        swissDataFirst10: typeof data?.swiss_data === 'string' ? data.swiss_data.substring(0, 10) : 'not-string',
        guestReportExists: !!data?.guest_report,
        fullDataKeys: data ? Object.keys(data) : 'no-data'
      });
      
      return data;
    },
    enabled: !!reportId,
  });
};