import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveEnrichedSwissDataToEdge } from '@/utils/saveEnrichedSwissData';
import { mapReportPayload } from '@/utils/mapReportPayload';

interface UseSwissDataRetryProps {
  guestReportId?: string;
  enabled?: boolean;
}

export const useSwissDataRetry = ({ guestReportId, enabled = true }: UseSwissDataRetryProps) => {
  const [retryStatus, setRetryStatus] = useState<'idle' | 'checking' | 'retrying' | 'completed' | 'failed'>('idle');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!enabled || !guestReportId) return;

    const checkAndRetrySwissData = async () => {
      setRetryStatus('checking');
      
      try {
        // First check if there's a temp_report_data row that needs saving
        const { data: tempRow, error: tempError } = await supabase
          .from('temp_report_data')
          .select('id, swiss_data_saved, swiss_data_save_pending, swiss_data_save_attempts')
          .eq('guest_report_id', guestReportId)
          .maybeSingle();

        if (tempError || !tempRow) {
          console.log('No temp_report_data row found or error:', tempError);
          setRetryStatus('idle');
          return;
        }

        // If already saved or currently pending, no need to retry
        if (tempRow.swiss_data_saved || tempRow.swiss_data_save_pending) {
          console.log('Swiss data already saved or pending');
          setRetryStatus('completed');
          return;
        }

        // If too many attempts, stop retrying
        if (tempRow.swiss_data_save_attempts >= 3) {
          console.log('Too many save attempts, stopping retry');
          setRetryStatus('failed');
          return;
        }

        // Get the full report data to extract Swiss data
        const { data: reportData, error: reportError } = await supabase
          .from('guest_reports')
          .select(`
            *,
            report_logs!guest_reports_report_log_id_fkey(report_text),
            translator_logs!guest_reports_translator_log_id_fkey(swiss_data)
          `)
          .eq('id', guestReportId)
          .single();

        if (reportError || !reportData) {
          console.error('Failed to fetch report data:', reportError);
          setRetryStatus('failed');
          return;
        }

        const fullReportData = {
          guest_report: reportData,
          report_content: reportData.report_logs?.report_text || null,
          swiss_data: reportData.translator_logs?.swiss_data || null,
          metadata: { source: 'retry_hook' }
        };

        const mappedReportData = mapReportPayload(fullReportData);

        if (!mappedReportData.swissData) {
          console.log('No Swiss data to save');
          setRetryStatus('idle');
          return;
        }

        // Attempt to save
        setRetryStatus('retrying');
        setAttempts(tempRow.swiss_data_save_attempts + 1);

        const result = await saveEnrichedSwissDataToEdge({
          uuid: guestReportId,
          swissData: mappedReportData.swissData,
          table: 'temp_report_data',
          field: 'swiss_data'
        });

        console.log('✅ Swiss data retry save successful:', result);
        setRetryStatus('completed');

      } catch (error) {
        console.error('❌ Swiss data retry failed:', error);
        setRetryStatus('failed');
      }
    };

    checkAndRetrySwissData();
  }, [guestReportId, enabled]);

  return {
    retryStatus,
    attempts,
    isRetrying: retryStatus === 'retrying',
    isCompleted: retryStatus === 'completed',
    hasFailed: retryStatus === 'failed'
  };
};