import { useState, useCallback } from 'react';
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
  report_type?: string | null;
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
  isAstroReport: (reportType: string | null) => boolean;
}

export const useGuestReportStatus = (): UseGuestReportStatusReturn => {
  const [report, setReport] = useState<GuestReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

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
          created_at: data.created_at
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
      console.log('📖 Fetching report content for guest ID:', guestReportId);
      
      const { data, error } = await supabase
        .from('guest_reports')
        .select(`
          report_log_id,
          report_logs!inner(report_text)
        `)
        .eq('id', guestReportId)
        .single();

      if (error) {
        console.error('❌ Error fetching report content:', error);
        return null;
      }

      if (data?.report_logs?.report_text) {
        console.log('✅ Report content fetched successfully');
        return data.report_logs.report_text;
      } else {
        console.log('📄 No report content found');
        return null;
      }
    } catch (err) {
      console.error('❌ Error fetching report content:', err);
      return null;
    }
  }, []);

  const fetchAstroData = useCallback(async (guestReportId: string) => {
    try {
      console.log('📊 Fetching astro data from translator_logs for guest ID:', guestReportId);
      
      const { data, error } = await supabase
        .from('guest_reports')
        .select(`
          translator_log_id,
          translator_logs!inner(swiss_data)
        `)
        .eq('id', guestReportId)
        .single();

      if (error) {
        console.error('❌ Error fetching astro data:', error);
        return null;
      }

      if (data?.translator_logs?.swiss_data) {
        const swissData = data.translator_logs.swiss_data as any;
        console.log('✅ Astro data fetched successfully:', swissData);

        // Check for report generation errors first
        if (swissData.report_error) {
          console.error('❌ Report generation failed:', swissData.report_error);
          return `Report generation failed: ${swissData.report_error}`;
        }

        // Extract report content from swiss_data.report.content
        if (swissData.report?.content) {
          console.log('📋 Extracted report content from swiss_data.report.content');
          return swissData.report.content;
        }

        // Fallback: check if report is directly in swiss_data
        if (swissData.report && typeof swissData.report === 'string') {
          console.log('📋 Found report content as string in swiss_data.report');
          return swissData.report;
        }

        // Fallback: return formatted swiss_data if no report content found
        console.warn('⚠️ No report content found, returning formatted swiss_data');
        return JSON.stringify(swissData, null, 2);
      } else {
        console.log('📄 No astro data found');
        return null;
      }
    } catch (err) {
      console.error('❌ Error fetching astro data:', err);
      return null;
    }
  }, []);

  const isAstroReport = useCallback((reportType: string | null) => {
    if (!reportType) return false;
    const type = reportType.toLowerCase();
    return type === 'sync' || type.startsWith('essence');
  }, []);

  const triggerErrorHandling = useCallback(async (guestReportId: string) => {
    console.log('🚨 Triggering error handling for timeout');
    
    const case_number = await logUserError(
      guestReportId, 
      'timeout_no_report', 
      'Report not found after timeout'
    );
    
    if (case_number) {
      setCaseNumber(case_number);
    }
    
    setError('We are looking into this issue. Please reference your case number if you contact support.');
  }, [logUserError]);

  return {
    report,
    isLoading,
    error,
    caseNumber,
    fetchReport,
    triggerErrorHandling,
    fetchReportContent,
    fetchAstroData,
    isAstroReport,
  };
};