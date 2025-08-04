
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestSessionManager } from './useGuestSessionManager';

export const useGuestReportData = (reportId: string | null) => {
  const { handleSessionReset } = useGuestSessionManager(reportId);

  return useQuery({
    queryKey: ['guest-report-data', reportId],
    queryFn: async () => {
      if (!reportId) {
        console.log('[useGuestReportData] No reportId provided, skipping query');
        return null;
      }
      
      console.log('[useGuestReportData] Fetching guest report data for:', reportId);
      
              const { data, error } = await supabase.functions.invoke('get-report-data', {
          body: { guest_report_id: reportId }
        });
      
      if (error) {
        console.error('[useGuestReportData] Error fetching guest report:', error);
        
        // Handle 404 errors gracefully - guest report no longer exists
        // Supabase function errors have a status property
        if ((error as any)?.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
          console.warn("Guest report not found — delegating to session manager");
          
          // Delegate to centralized session manager
          await handleSessionReset('guest_report_404');
          return null;
        }
        
        throw new Error(error.message || 'Failed to fetch report data');
      }
      
      console.log('[useGuestReportData] Successfully fetched guest report data');
      return data;
    },
    enabled: !!reportId && reportId.trim() !== '',
    retry: (failureCount, error) => {
      // Don't retry if the error is a 404 (report not found)
      if (error.message?.includes('not found') || error.message?.includes('404') || (error as any)?.status === 404) {
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
