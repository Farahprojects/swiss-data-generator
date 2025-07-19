
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getGuestReportId } from '@/utils/urlHelpers';
import { ReportData } from '@/utils/reportContentExtraction';

interface UseReportOrchestratorReturn {
  setupOrchestratorListener: (guestReportId?: string, onReportReady?: (reportData: ReportData) => void) => () => void;
}

export const useReportOrchestrator = (): UseReportOrchestratorReturn => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setupOrchestratorListener = useCallback((guestReportId?: string, onReportReady?: (reportData: ReportData) => void) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) {
      return () => {};
    }

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Listen for orchestrator broadcast
    const channel = supabase
      .channel(`report-ready-${reportId}`)
      .on('broadcast', { event: 'report_ready' }, (payload) => {
        console.log('[orchestrator-listener] Report data received from orchestrator:', payload);
        
        if (payload.payload?.guest_report_id === reportId && payload.payload?.report_data) {
          onReportReady?.(payload.payload.report_data);
        }
      })
      .subscribe((status) => {
        console.log(`[orchestrator-listener] Channel status: ${status}`);
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
    setupOrchestratorListener,
  };
};
