import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getGuestReportId } from '@/utils/urlHelpers';

interface GuestReport {
  id: string;
  email: string;
  has_report: boolean;
  translator_log_id?: string | null;
  report_log_id?: string | null;
  payment_status: string;
  created_at: string;
  stripe_session_id: string;
  report_type?: string | null;
  swiss_boolean?: boolean | null;
  has_swiss_error?: boolean | null;
  email_sent?: boolean;
}

interface ReportData {
  reportContent: string | null;
  swissData: any;
}

interface UseGuestReportStatusReturn {
  report: GuestReport | null;
  isLoading: boolean;
  error: string | null;
  caseNumber: string | null;
  fetchReport: (guestReportId?: string) => Promise<void>;
  triggerErrorHandling: (guestReportId?: string) => Promise<void>;
  fetchReportContent: (guestReportId?: string) => Promise<string | null>;
  fetchAstroData: (guestReportId?: string) => Promise<string | null>;
  fetchBothReportData: (guestReportId?: string) => Promise<ReportData>;
  fetchCompleteReport: (guestReportId?: string) => Promise<any>;
  isAstroReport: (reportType: string | null) => boolean;
  setupRealtimeListener: (guestReportId?: string, onReportReady?: () => void) => () => void;
  setError: (error: string | null) => void;
  setCaseNumber: (caseNumber: string | null) => void;
  triggerPdfEmail: (guestReportId?: string) => Promise<boolean>;
}

export const useGuestReportStatus = (): UseGuestReportStatusReturn => {
  const [report, setReport] = useState<GuestReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const errorLoggedRef = useRef<Set<string>>(new Set());

  const getSwissErrorMessage = useCallback((reportType: string | null) => {
    if (reportType === 'essence') {
      return 'Unable to generate your astrological essence data. This can happen due to incomplete birth information or system issues.';
    }
    return 'Astrological calculation failed. Please ensure your birth details are accurate and try again.';
  }, []);

  const logUserError = useCallback(async (guestReportId: string, errorType: string, errorMessage?: string) => {
    // Create a unique key for this error to prevent duplicates
    const errorKey = `${guestReportId}-${errorType}`;
    
    // Check if we've already logged this error
    if (errorLoggedRef.current.has(errorKey)) {
      console.log('⚠️ Error already logged, skipping duplicate:', errorKey);
      return null;
    }

    try {
      // Mark as being processed
      errorLoggedRef.current.add(errorKey);

      const { data, error } = await supabase.functions.invoke('log-user-error', {
        body: {
          guestReportId: guestReportId || null,
          errorType,
          errorMessage,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.warn('Failed to log user error:', error.message);
        // Remove from tracking since it failed
        errorLoggedRef.current.delete(errorKey);
        return null;
      }

      // Check if this is a duplicate error
      if (data?.is_duplicate) {
        console.log('ℹ️ Duplicate error detected:', data.message);
        setError(data.message);
        return data.case_number;
      }

      // Error logged successfully
      return data?.case_number || 'CASE-' + Date.now();
    } catch (err) {
      console.error('❌ Error logging user error:', err);
      // Remove from tracking since it failed
      errorLoggedRef.current.delete(errorKey);
      return null;
    }
  }, []);

  const fetchReport = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) {
      console.warn('No guest report ID available');
      return;
    }

    setIsLoading(true);
    try {
      // Fetching report status

      const { data, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setReport(data);
        
        // Check for Swiss error immediately
        if (data.has_swiss_error === true) {
          const errorMessage = getSwissErrorMessage(data.report_type);
          setError(errorMessage);
          
          // Log the Swiss error and get case number (only if not already logged)
          if (!caseNumber) {
            const case_number = await logUserError(
              reportId,
              'swiss_data_generation_failed',
              `Swiss data generation failed for report type: ${data.report_type || 'unknown'}`
            );
            if (case_number) setCaseNumber(case_number);
          }
        } else {
          setError(null);
        }
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error('❌ Error fetching report status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReportContent = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) return null;

    try {
      const { data, error } = await supabase
        .from('guest_reports')
        .select(`report_log_id, report_logs!inner(report_text)`)
        .eq('id', reportId)
        .single();

      if (error) {
        console.error('❌ Error fetching report content:', error);
        return null;
      }

      return data?.report_logs?.report_text || null;
    } catch (err) {
      console.error('❌ Error fetching report content:', err);
      return null;
    }
  }, []);

  const fetchAstroData = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) return null;

    try {
      const { data: guestData, error: guestError } = await supabase
        .from('guest_reports')
        .select('translator_log_id')
        .eq('id', reportId)
        .single();

      if (guestError) {
        console.error('❌ Error fetching guest report:', guestError);
        return null;
      }

      if (!guestData?.translator_log_id) return null;

      const { data: translatorData, error: translatorError } = await supabase
        .from('translator_logs')
        .select('swiss_data')
        .eq('id', guestData.translator_log_id)
        .single();

      if (translatorError) {
        console.error('❌ Error fetching translator data:', translatorError);
        return null;
      }

      const swissData = translatorData?.swiss_data as any;
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
    } catch (err) {
      console.error('❌ Error fetching astro data:', err);
      return null;
    }
  }, []);

  const fetchBothReportData = useCallback(async (guestReportId?: string): Promise<ReportData> => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) return { reportContent: null, swissData: null };

    try {
      // Fetch both report content and Swiss data in parallel
      const [reportContent, astroDataRaw] = await Promise.all([
        fetchReportContent(reportId),
        fetchAstroData(reportId)
      ]);

      // Get raw Swiss data for formatting
      const { data: guestData } = await supabase
        .from('guest_reports')
        .select('translator_log_id')
        .eq('id', reportId)
        .single();

      let swissData = null;
      if (guestData?.translator_log_id) {
        const { data: translatorData } = await supabase
          .from('translator_logs')
          .select('swiss_data')
          .eq('id', guestData.translator_log_id)
          .single();
        swissData = translatorData?.swiss_data;
      }

      return {
        reportContent,
        swissData
      };
    } catch (err) {
      console.error('❌ Error fetching both report data:', err);
      return { reportContent: null, swissData: null };
    }
  }, [fetchReportContent, fetchAstroData]);

  const fetchCompleteReport = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) {
      throw new Error('No guest report ID available');
    }

    try {
      // Fetching complete report data
      
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { guest_id: reportId }
      });

      if (error) {
        console.error('❌ Error fetching complete report:', error);
        throw new Error(`Failed to fetch report: ${error.message}`);
      }

      // Complete report data fetched
      return data;
    } catch (err) {
      console.error('❌ Error in fetchCompleteReport:', err);
      throw err;
    }
  }, []);

  const isAstroReport = useCallback((reportType: string | null) => {
    if (!reportType) return false;
    const type = reportType.toLowerCase();
    return type === 'sync' || type === 'essence';
  }, []);

  const triggerErrorHandling = useCallback(async (guestReportId?: string) => {
    const reportId = guestReportId || getGuestReportId();
    
    // Check if we already have a case number to prevent duplicates
    if (caseNumber) {
      console.log('⚠️ Error handling already completed, case number exists:', caseNumber);
      return;
    }
    
    // Handle case where no report ID is available
    if (!reportId) {
      console.warn('⚠️ Triggering error handling without report ID');
      const case_number = await logUserError(
        '',
        'missing_report_id',
        'No guest report ID available for error handling'
      );
      if (case_number) setCaseNumber(case_number);
      setError('We are looking into this issue. Please reference your case number if you contact support.');
      return;
    }

    const case_number = await logUserError(
      reportId,
      'timeout_no_report',
      'Report not found after timeout'
    );
    if (case_number) setCaseNumber(case_number);
    setError('We are looking into this issue. Please reference your case number if you contact support.');
  }, [logUserError, caseNumber]);

  const triggerPdfEmail = useCallback(async (guestReportId?: string): Promise<boolean> => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) {
      console.warn('No guest report ID available for PDF email');
      return false;
    }

    try {
      // Check if email was already sent
      const { data: reportData, error: fetchError } = await supabase
        .from('guest_reports')
        .select('email_sent')
        .eq('id', reportId)
        .single();

      if (fetchError) {
        console.error('❌ Error checking email status:', fetchError);
        return false;
      }

      if (reportData?.email_sent) {
        console.log('📧 Email already sent, skipping duplicate');
        return true; // Consider this success since email was already sent
      }

      // Trigger PDF generation and email
      console.log('📧 Triggering PDF email generation...');
      const { data, error } = await supabase.functions.invoke('process-guest-report-pdf', {
        body: { guest_report_id: reportId }
      });

      if (error) {
        console.error('❌ Error triggering PDF email:', error);
        return false;
      }

      console.log('✅ PDF email triggered successfully');
      return true;
    } catch (err) {
      console.error('❌ Error in triggerPdfEmail:', err);
      return false;
    }
  }, []);

  const setupRealtimeListener = useCallback((guestReportId?: string, onReportReady?: () => void) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) {
      console.warn('No guest report ID available for realtime listener');
      return () => {};
    }

    // Setting up realtime listener

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`guest-report-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_reports',
          filter: `id=eq.${reportId}`
        },
        async (payload) => {
          const updatedRecord = payload.new as GuestReport & { modal_ready?: boolean };

          // Check for Swiss error first
          if (updatedRecord.has_swiss_error === true) {
            setReport(updatedRecord);
            const errorMessage = getSwissErrorMessage(updatedRecord.report_type);
            setError(errorMessage);
            return; // Don't trigger modal for errors
          }

          const isReportReady =
            updatedRecord.swiss_boolean === true ||
            (updatedRecord.has_report && (updatedRecord.translator_log_id || updatedRecord.report_log_id));

          // Check if orchestrator set modal_ready flag
          const shouldTriggerModal = updatedRecord.modal_ready === true;

          if (isReportReady || shouldTriggerModal) {
            setReport(updatedRecord);
            if (shouldTriggerModal) {
            }
            onReportReady?.();
          }
        }
      )
      .subscribe((status) => {
        // Realtime subscription status updated
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return {
    report,
    isLoading,
    error,
    caseNumber,
    fetchReport,
    triggerErrorHandling,
    fetchReportContent,
    fetchAstroData,
    fetchBothReportData,
    fetchCompleteReport,
    isAstroReport,
    setupRealtimeListener,
    setError,
    setCaseNumber,
    triggerPdfEmail,
  };
};
