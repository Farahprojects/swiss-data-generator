
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GuestReport {
  id: string;
  email: string;
  has_report: boolean;
  report_content: string | null;
  report_pdf_data: string | null;
  payment_status: string;
  created_at: string;
  stripe_session_id: string;
}

interface UseGuestReportStatusReturn {
  report: GuestReport | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  startPolling: (email: string) => void;
  stopPolling: () => void;
}

export const useGuestReportStatus = (): UseGuestReportStatusReturn => {
  const [report, setReport] = useState<GuestReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs for stable references that don't trigger re-renders
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingEmailRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);
  const maxRetriesRef = useRef<number>(10);

  const fetchReportStatus = useCallback(async (email: string) => {
    try {
      console.log('🔍 Fetching report status for:', email);
      
      const { data, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
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
        if (data.has_report && data.report_content) {
          console.log('✅ Report is ready, stopping polling');
          stopPolling();
        }
      } else {
        console.log('❌ No report found for email:', email);
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

  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping polling');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    setIsLoading(false);
    pollingEmailRef.current = '';
    retryCountRef.current = 0;
  }, []);

  const startPolling = useCallback((email: string) => {
    // Guard against multiple polling instances for the same email
    if (isPolling && pollingEmailRef.current === email) {
      console.log('📍 Already polling for this email, skipping');
      return;
    }

    console.log('▶️ Starting polling for email:', email);
    
    // Stop any existing polling first
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollingEmailRef.current = email;
    setIsPolling(true);
    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;

    // Initial fetch
    fetchReportStatus(email);

    // Start polling every 5 seconds with exponential backoff on errors
    const interval = setInterval(() => {
      const delay = Math.min(5000 * Math.pow(1.5, retryCountRef.current), 30000); // Max 30 seconds
      setTimeout(() => {
        if (pollingEmailRef.current === email) { // Only fetch if still polling same email
          fetchReportStatus(email);
        }
      }, retryCountRef.current > 0 ? delay - 5000 : 0);
    }, 5000);

    pollIntervalRef.current = interval;

    // Auto-stop polling after 10 minutes (timeout)
    setTimeout(() => {
      if (pollingEmailRef.current === email) {
        console.log('⏰ Polling timeout reached, stopping polling');
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
    startPolling,
    stopPolling,
  };
};
