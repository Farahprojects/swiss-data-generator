import { supabase } from '@/integrations/supabase/client';
import { ReportData } from '@/utils/reportContentExtraction';
import { useState, useEffect } from 'react';

export const useReportData = (conversationId: string | null) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setReportData(null);
      return;
    }

    const fetchReportData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, get the guest_report_id from the conversations table
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('guest_report_id')
          .eq('id', conversationId)
          .single();

        if (convError || !convData) {
          throw new Error(
            convError?.message || 'Conversation not found.'
          );
        }

        const guestReportId = convData.guest_report_id;

        if (!guestReportId) {
          throw new Error('No report associated with this conversation.');
        }

        // Now, fetch the report data using the guest_report_id
        const { data: reportData, error: reportError } = await supabase
          .from('guest_reports')
          .select(
            `
            *,
            report_content:report_content(content),
            swiss_data:swiss_data(data)
          `
          )
          .eq('id', guestReportId)
          .single();

        if (reportError) {
          throw new Error(reportError.message);
        }

        if (reportData) {
          // The structure from the query is a bit nested, so we format it
          // to match the ReportData type expected by ReportViewer.
          const formattedData: ReportData = {
            ...reportData,
            guest_report: {
              id: reportData.id,
              // other guest_report fields can be mapped here if needed
            },
            report_content:
              (reportData.report_content as any)?.content || '',
            swiss_data: (reportData.swiss_data as any)?.data || null,
          };
          setReportData(formattedData);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching report data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [conversationId]);

  return { reportData, isLoading, error };
};
