
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePdfEmail = () => {
  return useMutation({
    mutationFn: async (guestReportId: string): Promise<boolean> => {
      // Check if email was already sent
      const { data: reportData, error: fetchError } = await supabase
        .from('guest_reports')
        .select('email_sent')
        .eq('id', guestReportId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to check email status: ${fetchError.message}`);
      }

      if (reportData?.email_sent) {
        return true; // Already sent
      }

      // Trigger PDF generation and email
      const { data, error } = await supabase.functions.invoke('process-guest-report-pdf', {
        body: { guest_report_id: guestReportId }
      });

      if (error) {
        throw new Error(`Failed to trigger PDF email: ${error.message}`);
      }

      return true;
    },
  });
};
