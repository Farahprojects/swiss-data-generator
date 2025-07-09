import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  fetchReport: (guestReportId: string) => Promise<void>;
  triggerErrorHandling: (guestReportId: string) => Promise<void>;
  fetchReportContent: (guestReportId: string) => Promise<string | null>;
  fetchAstroData: (guestReportId: string) => Promise<string | null>;
  fetchBothReportData: (guestReportId: string) => Promise<ReportData>;
  isAstroReport: (reportType: string | null) => boolean;
  setupRealtimeListener: (guestReportId: string, onReportReady?: () => void) => () => void;
}

export const useGuestReportStatus = (): UseGuestReportStatusReturn => {
  const [report, setReport] = useState<GuestReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const logUserError = useCallback(async (guestReportId: string, errorType: string, errorMessage?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('log-user-error', {
        body: {
          guestReportId,
          errorType,
          errorMessage,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.warn('Failed to log user error:', error.message);
        return null;
      }

      console.log('📝 Logged error successfully');
      return 'CASE-' + Date.now();
    } catch (err) {
      console.error('❌ Error logging user error:', err);
      return null;
    }
  }, []);

  const fetchReport = useCallback(async (guestReportId: string) => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching report status for guest ID:', guestReportId);

      const { data, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestReportId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        console.log('📊 Report status:', {
          id: data.id,
          has_report: data.has_report,
          payment_status: data.payment_status,
          created_at: data.created_at,
          swiss_boolean: data.swiss_boolean,
        });
        setReport(data);
        setError(null);
      } else {
        console.log('❌ No report found for guest ID:', guestReportId);
        setReport(null);
      }
    } catch (err) {
      console.error('❌ Error fetching report status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReportContent = useCallback(async (guestReportId: string) => {
    try {
      const { data, error } = await supabase
        .from('guest_reports')
        .select(`report_log_id, report_logs!inner(report_text)`)
        .eq('id', guestReportId)
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

  const fetchAstroData = useCallback(async (guestReportId: string) => {
    try {
      const { data: guestData, error: guestError } = await supabase
        .from('guest_reports')
        .select('translator_log_id')
        .eq('id', guestReportId)
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

  const fetchBothReportData = useCallback(async (guestReportId: string): Promise<ReportData> => {
    try {
      // Fetch both report content and Swiss data in parallel
      const [reportContent, astroDataRaw] = await Promise.all([
        fetchReportContent(guestReportId),
        fetchAstroData(guestReportId)
      ]);

      // Get raw Swiss data for formatting
      const { data: guestData } = await supabase
        .from('guest_reports')
        .select('translator_log_id')
        .eq('id', guestReportId)
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

  const isAstroReport = useCallback((reportType: string | null) => {
    if (!reportType) return false;
    const type = reportType.toLowerCase();
    return type === 'sync' || type === 'essence';
  }, []);

  const triggerErrorHandling = useCallback(async (guestReportId: string) => {
    const case_number = await logUserError(
      guestReportId,
      'timeout_no_report',
      'Report not found after timeout'
    );
    if (case_number) setCaseNumber(case_number);
    setError('We are looking into this issue. Please reference your case number if you contact support.');
  }, [logUserError]);

  const setupRealtimeListener = useCallback((guestReportId: string, onReportReady?: () => void) => {
    console.log('🔄 Setting up realtime listener for guest report:', guestReportId);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`guest-report-${guestReportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_reports',
          filter: `id=eq.${guestReportId}`
        },
        async (payload) => {
          const updatedRecord = payload.new as GuestReport & { modal_ready?: boolean };

          const isReportReady =
            updatedRecord.swiss_boolean === true ||
            (updatedRecord.has_report && (updatedRecord.translator_log_id || updatedRecord.report_log_id));

          // Check if orchestrator set modal_ready flag
          const shouldTriggerModal = updatedRecord.modal_ready === true;

          if (isReportReady || shouldTriggerModal) {
            console.log('✅ Report ready:', {
              swiss_boolean: updatedRecord.swiss_boolean,
              has_report: updatedRecord.has_report,
              translator_log_id: !!updatedRecord.translator_log_id,
              report_log_id: !!updatedRecord.report_log_id,
              modal_ready: updatedRecord.modal_ready
            });
            setReport(updatedRecord);
            if (shouldTriggerModal) {
              console.log('🔥 Modal ready flag detected - triggering modal');
            }
            onReportReady?.();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
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
    isAstroReport,
    setupRealtimeListener,
  };
};
