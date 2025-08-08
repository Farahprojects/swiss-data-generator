
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePdfEmail = () => {
  return useMutation({
    mutationFn: async ({ guestReportId, email }: { guestReportId: string; email?: string }): Promise<{ alreadySent: boolean; sentAt?: string }> => {
      // Check if email was already sent
      const { data: reportData, error: fetchError } = await supabase
        .from('guest_reports')
        .select('email_sent, email_sent_at')
        .eq('id', guestReportId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to check email status: ${fetchError.message}`);
      }

      if (reportData?.email_sent) {
        return { alreadySent: true, sentAt: reportData.email_sent_at ?? undefined };
      }

      // Trigger PDF generation and email
      const { data, error } = await supabase.functions.invoke('process-guest-report-pdf', {
        body: { guest_report_id: guestReportId, email }
      });

      if (error) {
        throw new Error(`Failed to trigger PDF email: ${error.message}`);
      }

      return { alreadySent: false };
    },
  });
};
