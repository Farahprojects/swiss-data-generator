
import { useState, useEffect, useCallback } from 'react';
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
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingEmail, setPollingEmail] = useState<string>('');

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
      setError(err instanceof Error ? err.message : 'Failed to fetch report status');
    }
  }, []);

  const startPolling = useCallback((email: string) => {
    console.log('▶️ Starting polling for email:', email);
    setPollingEmail(email);
    setIsPolling(true);
    setIsLoading(true);
    setError(null);

    // Clear any existing interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Initial fetch
    fetchReportStatus(email);

    // Start polling every 5 seconds
    const interval = setInterval(() => {
      fetchReportStatus(email);
    }, 5000);

    setPollInterval(interval);

    // Auto-stop polling after 10 minutes (timeout)
    setTimeout(() => {
      console.log('⏰ Polling timeout reached, stopping polling');
      stopPolling();
    }, 10 * 60 * 1000);
  }, [fetchReportStatus, pollInterval]);

  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping polling');
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    setIsPolling(false);
    setIsLoading(false);
    setPollingEmail('');
  }, [pollInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  return {
    report,
    isLoading,
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
};
