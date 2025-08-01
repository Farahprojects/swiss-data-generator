
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resetGuestSessionOn404 } from '@/utils/urlHelpers';

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
        
        // Handle 404 errors gracefully - guest report no longer exists
        // Supabase function errors have a status property
        if ((error as any)?.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
          console.warn("Guest report not found — clearing session and refreshing app");

          // Comprehensive state reset
          await resetGuestSessionOn404();

          // Optional: flag that we *already refreshed once* to avoid infinite loop
          if (!sessionStorage.getItem("refreshOnce")) {
            sessionStorage.setItem("refreshOnce", "true");
            window.location.reload(); // or redirect to "/" or report setup page
          } else {
            console.warn("Prevented infinite reload loop");
            // Fallback to homepage redirect if reload loop detected
            window.location.href = '/';
          }
          
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
