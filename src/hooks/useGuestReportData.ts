
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuestReportData = (reportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report-data', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { id: reportId }
      });
      
      if (error) {
        // Ensure the error gets properly thrown so React Query catches it
        throw new Error(error.message || 'Failed to fetch report data');
      }
      
      return data;
    },
    enabled: !!reportId,
    retry: false, // Don't retry on 404 errors
    // No polling - data will be fetched on demand via orchestrator signals
  });
};
