
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GuestReport {
  id: string;
  email: string;
  has_report: boolean;
  translator_log_id?: string | null;
  report_log_id?: string | null;
  payment_status: string;
  created_at: string;
  stripe_session_id: string;
}

interface UseGuestReportStatusReturn {
  report: GuestReport | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  caseNumber: string | null;
  startPolling: (guestReportId: string) => void;
  stopPolling: () => void;
  triggerErrorHandling: (guestReportId: string) => Promise<void>;
}

export const useGuestReportStatus = (): UseGuestReportStatusReturn => {
  const [report, setReport] = useState<GuestReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  
  // Use refs for stable references that don't trigger re-renders
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingGuestIdRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);
  const maxRetriesRef = useRef<number>(10);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logUserError = useCallback(async (guestReportId: string, errorType: string, errorMessage?: string) => {
    try {
      // Use Supabase edge function via the client
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

  const fetchReportStatus = useCallback(async (guestReportId: string) => {
    try {
      console.log('🔍 Fetching report status for guest ID:', guestReportId);
      
      const { data, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestReportId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      if (data) {
        console.log('📊 Report status:', {
          id: data.id,
          has_report: data.has_report,
          payment_status: data.payment_status,
          created_at: data.created_at
        });
        setReport(data);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on success
        
        // Stop polling if report is ready
        if (data.has_report && (data.translator_log_id || data.report_log_id)) {
          console.log('✅ Report is ready, stopping polling');
          stopPolling();
        }
      } else {
        console.log('❌ No report found for guest ID:', guestReportId);
        setReport(null);
      }
    } catch (err) {
      console.error('❌ Error fetching report status:', err);
      retryCountRef.current += 1;
      
      if (retryCountRef.current >= maxRetriesRef.current) {
        console.error('❌ Max retries reached, stopping polling');
        setError('Unable to check report status. Please refresh the page.');
        stopPolling();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch report status');
      }
    }
  }, []);

  const triggerErrorHandling = useCallback(async (guestReportId: string) => {
    console.log('🚨 Triggering error handling for countdown completion');
    
    // Log the countdown completion error and get case number
    const case_number = await logUserError(
      guestReportId, 
      'countdown_completed_no_report', 
      'Report not found after countdown completion'
    );
    
    if (case_number) {
      setCaseNumber(case_number);
    }
    
    setError('We are looking into this issue. Please reference your case number if you contact support.');
  }, [logUserError]);

  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping polling');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsPolling(false);
    setIsLoading(false);
    pollingGuestIdRef.current = '';
    retryCountRef.current = 0;
  }, []);

  const startPolling = useCallback((guestReportId: string) => {
    // Guard against multiple polling instances for the same guest report
    if (isPolling && pollingGuestIdRef.current === guestReportId) {
      console.log('📍 Already polling for this guest report, skipping');
      return;
    }

    console.log('▶️ Starting polling for guest report ID:', guestReportId);
    
    // Stop any existing polling first
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollingGuestIdRef.current = guestReportId;
    setIsPolling(true);
    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;

    // Initial fetch
    fetchReportStatus(guestReportId);

    // Start polling every 5 seconds with exponential backoff on errors
    const interval = setInterval(() => {
      const delay = Math.min(5000 * Math.pow(1.5, retryCountRef.current), 30000); // Max 30 seconds
      setTimeout(() => {
        if (pollingGuestIdRef.current === guestReportId) { // Only fetch if still polling same report
          fetchReportStatus(guestReportId);
        }
      }, retryCountRef.current > 0 ? delay - 5000 : 0);
    }, 5000);

    pollIntervalRef.current = interval;

    // Auto-stop polling after 10 minutes (timeout)
    pollTimeoutRef.current = setTimeout(async () => {
      if (pollingGuestIdRef.current === guestReportId) {
        console.log('⏰ Polling timeout reached, logging error and stopping polling');
        
        // Log the timeout error and get case number
        const case_number = await logUserError(
          guestReportId, 
          'polling_timeout', 
          'Report generation timed out after 10 minutes'
        );
        
        if (case_number) {
          setCaseNumber(case_number);
        }
        
        setError('Report generation is taking longer than expected. We have logged this issue for investigation.');
        stopPolling();
      }
    }, 10 * 60 * 1000);
  }, [isPolling, fetchReportStatus, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    report,
    isLoading,
    isPolling,
    error,
    caseNumber,
    startPolling,
    stopPolling,
    triggerErrorHandling,
  };
};