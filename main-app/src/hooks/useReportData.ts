import { supabase } from '@/integrations/supabase/client';
import { ReportData } from '@/utils/reportContentExtraction';
import { useState, useCallback } from 'react';

export const useReportData = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (guestReportId: string | null) => {
    if (!guestReportId) {
      setError("No report ID provided.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      // Directly invoke the edge function without checking report_ready_signals
      const { data: report, error: functionError } = await supabase.functions.invoke(
        'get-report-data',
        { body: { guest_report_id: guestReportId } }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }



      setReportData(report.data as ReportData);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { reportData, isLoading, error, fetchReport };
};
