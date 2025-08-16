import { supabase } from '@/integrations/supabase/client';
import { ReportData } from '@/utils/reportContentExtraction';
import { useState, useEffect } from 'react';

export const useReportData = (guestReportId: string | null) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guestReportId) {
      setReportData(null);
      return;
    }

    const fetchReportData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('guest_reports')
          .select('*, report_content:report_content(content), swiss_data:swiss_data(data)')
          .eq('id', guestReportId)
          .single();

        if (error) throw error;

        if (data) {
          const formattedData: ReportData = {
            ...data,
            guest_report: { id: data.id, ...data },
            report_content: (data.report_content as any)?.content || '',
            swiss_data: (data.swiss_data as any)?.data || null,
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
  }, [guestReportId]);

  return { reportData, isLoading, error };
};
