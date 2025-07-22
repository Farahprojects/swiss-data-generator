
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSwissData = (guestReportId: string | null) => {
  return useQuery({
    queryKey: ['swiss-data', guestReportId],
    queryFn: async (): Promise<unknown | null> => {
      if (!guestReportId) return null;

      const { data: guestData, error: guestError } = await supabase
        .from('guest_reports')
        .select('translator_log_id')
        .eq('id', guestReportId)
        .single();

      if (guestError) {
        throw new Error(`Failed to fetch guest report: ${guestError.message}`);
      }

      if (!guestData?.translator_log_id) return null;

      const { data: translatorData, error: translatorError } = await supabase
        .from('translator_logs')
        .select('swiss_data')
        .eq('id', guestData.translator_log_id)
        .single();

      if (translatorError) {
        throw new Error(`Failed to fetch translator data: ${translatorError.message}`);
      }

      return translatorData?.swiss_data || null;
    },
    enabled: !!guestReportId,
    staleTime: 60_000, // Swiss data is stable once generated
  });
};
