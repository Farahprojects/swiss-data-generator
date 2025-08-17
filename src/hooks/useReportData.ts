import { supabase } from '@/integrations/supabase/client';
import { ReportData, GetReportDataResponse } from '@/utils/reportContentExtraction';
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
      console.log('[useReportData] Calling get-report-data with guestReportId:', guestReportId);
      const { data: report, error: functionError } = await supabase.functions.invoke(
        'get-report-data',
        { body: { guest_report_id: guestReportId } }
      );

      console.log('[useReportData] Raw response from get-report-data:', report);
      console.log('[useReportData] Function error:', functionError);

      if (functionError) {
        console.error('[useReportData] Function error details:', functionError);
        throw new Error(functionError.message);
      }

      if (!report) {
        console.error('[useReportData] No report data returned');
        throw new Error('No report data returned from server');
      }

      console.log('[useReportData] Report response structure:', {
        hasData: !!report.data,
        reportKeys: report ? Object.keys(report) : 'N/A',
        dataKeys: report.data ? Object.keys(report.data) : 'N/A'
      });

      // Type the response properly
      const typedResponse = report as GetReportDataResponse;
      if (!typedResponse.data) {
        console.error('[useReportData] Response missing data property');
        throw new Error('Invalid response structure: missing data property');
      }

      setReportData(typedResponse.data);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { reportData, isLoading, error, fetchReport };
};
