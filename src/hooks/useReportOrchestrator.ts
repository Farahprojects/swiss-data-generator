
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getGuestReportId } from '@/utils/urlHelpers';
import { ReportData } from '@/utils/reportContentExtraction';

interface UseReportOrchestratorReturn {
  setupOrchestratorListener: (guestReportId?: string, onReportReady?: (reportData: ReportData) => void, refetchGuestData?: () => void) => () => void;
}

export const useReportOrchestrator = (): UseReportOrchestratorReturn => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setupOrchestratorListener = useCallback((guestReportId?: string, onReportReady?: (reportData: ReportData) => void, refetchGuestData?: () => void) => {
    const reportId = guestReportId || getGuestReportId();
    if (!reportId) {
      return () => {};
    }

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Listen for orchestrator broadcast
    const channel = supabase
      .channel(`report-ready-${reportId}`)
      .on('broadcast', { event: 'report_ready' }, async (payload) => {
        console.log('[orchestrator-listener] Report ready broadcast received for:', reportId);
        
        if (payload.payload?.guest_report_id === reportId) {
          // Trigger refetch to update React Query cache
          if (refetchGuestData) {
            console.log('[orchestrator-listener] Triggering data refetch...');
            await refetchGuestData();
          }
          
          // Then notify components that report is ready
          if (payload.payload?.report_data && onReportReady) {
            console.log('[orchestrator-listener] Calling onReportReady callback');
            onReportReady(payload.payload.report_data);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[orchestrator-listener] Channel status: ${status}`);
        
        // Handle reconnection - check if report is already ready
        if (status === 'SUBSCRIBED' && channelRef.current) {
          // Small delay to allow any pending broadcasts to come through first
          setTimeout(async () => {
            try {
              const { data, error } = await supabase.functions.invoke('get-guest-report', {
                body: { guest_report_id: reportId }
              });
              
              if (!error && data) {
                console.log('[orchestrator-listener] Found ready report on reconnect');
                
                // Trigger refetch to update cache
                if (refetchGuestData) {
                  await refetchGuestData();
                }
                
                // Then call the callback
                if (onReportReady) {
                  onReportReady(data);
                }
              }
            } catch (err) {
              console.log('[orchestrator-listener] Reconnect check failed:', err);
            }
          }, 500);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  return {
    setupOrchestratorListener,
  };
};
