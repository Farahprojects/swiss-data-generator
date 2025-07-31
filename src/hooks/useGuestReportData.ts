
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuestReportData = (reportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report-data', reportId],
    queryFn: async () => {
      if (!reportId) {
        console.log('[useGuestReportData] No reportId provided, skipping query');
        return null;
      }
      
      console.log('[useGuestReportData] Fetching guest report data for:', reportId);
      
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { id: reportId }
      });
      
      if (error) {
        console.error('[useGuestReportData] Error fetching guest report:', error);
        throw new Error(error.message || 'Failed to fetch report data');
      }
      
      console.log('[useGuestReportData] Successfully fetched guest report data');
      return data;
    },
    enabled: !!reportId && reportId.trim() !== '',
    retry: (failureCount, error) => {
      // Don't retry if the error is a 404 (report not found)
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
