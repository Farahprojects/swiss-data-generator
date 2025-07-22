import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGuestReport } from './useGuestReport';
import { useReportLogs } from './useReportLogs';
import { useSwissData } from './useSwissData';
import { useErrorHandling } from './useErrorHandling';
import { usePdfEmail } from './usePdfEmail';
import { getGuestReportId, getSwissErrorMessage, isAstroReport } from '@/utils/reportHelpers';

interface ReportData {
  reportContent: string | null;
  swissData: unknown;
}

export const useGuestReportStatus = () => {
  const [activeGuestId, setActiveGuestId] = useState<string | null>(() => getGuestReportId());
  const [error, setError] = useState<string | null>(null);

  // Use focused hooks
  const guestQuery = useGuestReport(activeGuestId);
  const reportLogsQuery = useReportLogs(activeGuestId);
  const swissDataQuery = useSwissData(activeGuestId);
  const errorHandling = useErrorHandling();
  const pdfEmailMutation = usePdfEmail();

  // Handle Swiss errors - enhanced to work with new error flow
  const report = guestQuery.data;
  if (report?.has_swiss_error && !error && !errorHandling.caseNumber) {
    const errorMessage = getSwissErrorMessage(report.report_type);
    setError(errorMessage);
    
    if (activeGuestId) {
      errorHandling.handleError({
        guestReportId: activeGuestId,
        errorType: 'swiss_data_generation_failed',
        errorMessage: `Swiss data generation failed for report type: ${report.report_type || 'unknown'}`
      });
    }
  }

  const fetchReport = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || getGuestReportId();
    if (reportId && reportId !== activeGuestId) {
      setActiveGuestId(reportId);
      setError(null);
    }
  }, [activeGuestId]);

  const fetchBothReportData = useCallback(async (guestReportId?: string): Promise<ReportData> => {
    const reportId = guestReportId || activeGuestId;
    if (!reportId) return { reportContent: null, swissData: null };

    // Use the query data if available, otherwise return nulls
    return {
      reportContent: reportLogsQuery.data || null,
      swissData: swissDataQuery.data || null
    };
  }, [activeGuestId, reportLogsQuery.data, swissDataQuery.data]);

  const fetchCompleteReport = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || activeGuestId;
    if (!reportId) {
      throw new Error('No guest report ID available');
    }

    const { data, error } = await supabase.functions.invoke('get-guest-report', {
      body: { guest_id: reportId }
    });

    if (error) {
      throw new Error(`Failed to fetch report: ${error.message}`);
    }

    return data;
  }, [activeGuestId]);

  const triggerErrorHandling = useCallback(async (guestReportId?: string, errorType?: string, errorMessage?: string) => {
    const reportId = guestReportId || activeGuestId;
    
    if (errorHandling.caseNumber) return; // Already handled
    
    if (!reportId) {
      await errorHandling.handleError({
        guestReportId: '',
        errorType: errorType || 'missing_report_id',
        errorMessage: errorMessage || 'No guest report ID available for error handling'
      });
      setError('We are looking into this issue. Please reference your case number if you contact support.');
      return;
    }

    await errorHandling.handleError({
      guestReportId: reportId,
      errorType: errorType || 'timeout_no_report',
      errorMessage: errorMessage || 'Report not found after timeout'
    });
    setError('We are looking into this issue. Please reference your case number if you contact support.');
  }, [activeGuestId, errorHandling]);

  const triggerPdfEmail = useCallback(async (guestReportId?: string): Promise<boolean> => {
    const reportId = guestReportId || activeGuestId;
    if (!reportId) return false;

    try {
      await pdfEmailMutation.mutateAsync(reportId);
      return true;
    } catch (err) {
      console.error('Error in triggerPdfEmail:', err);
      return false;
    }
  }, [activeGuestId, pdfEmailMutation]);

  return {
    report: guestQuery.data || null,
    isLoading: guestQuery.isLoading || reportLogsQuery.isLoading || swissDataQuery.isLoading,
    error: error || guestQuery.error?.message || reportLogsQuery.error?.message || swissDataQuery.error?.message || null,
    caseNumber: errorHandling.caseNumber,
    fetchReport,
    triggerErrorHandling,
    fetchReportContent: () => reportLogsQuery.data || null,
    fetchAstroData: () => {
      const swissData = swissDataQuery.data as any;
      if (!swissData) return null;
      
      if (swissData.report_error) {
        return `Report generation failed: ${swissData.report_error}`;
      }
      
      if (swissData.report?.content) {
        return swissData.report.content;
      }
      
      if (typeof swissData.report === 'string') {
        return swissData.report;
      }
      
      return JSON.stringify(swissData, null, 2);
    },
    fetchBothReportData,
    fetchCompleteReport,
    isAstroReport,
    setError,
    setCaseNumber: errorHandling.setCaseNumber,
    triggerPdfEmail,
  };
};
