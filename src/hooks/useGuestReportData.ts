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
      
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });
};