import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuestReport = (reportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      
      const { data, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', reportId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });
};