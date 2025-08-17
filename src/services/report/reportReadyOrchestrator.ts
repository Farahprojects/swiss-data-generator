import { supabase } from '@/integrations/supabase/client';
import { useReportReadyStore } from './reportReadyStore';

// Guards to ensure single listener instance per UUID
const activeChannels: Record<string, { channel: any; startedAt: number }> = {};

export async function checkReportSeen(guestReportId: string): Promise<{ hasRow: boolean; seen: boolean }>{
  console.log('[ReportReady] ask', guestReportId);
  const { data, error } = await supabase
    .from('report_ready_signals')
    .select('guest_report_id, seen')
    .eq('guest_report_id', guestReportId)
    .limit(1);

  if (error) {
    // Treat errors as not found to avoid blocking the flow; caller may decide to poll
    return { hasRow: false, seen: false };
  }

  if (data && data.length > 0) {
    const row: any = data[0];
    return { hasRow: true, seen: !!row.seen };
  }
  return { hasRow: false, seen: false };
}

export async function markReportSeen(guestReportId: string): Promise<void> {
  try {
    await supabase
      .from('report_ready_signals')
      .update({ seen: true })
      .eq('guest_report_id', guestReportId);
  } catch (_e) {
    // non-fatal
  }
}

export function startReportReadyOrchestration(guestReportId: string): void {
  if (!guestReportId) return;
  // Prevent duplicate starts
  if (activeChannels[guestReportId]) return;

  // Check if report is already ready
  if (useReportReadyStore.getState().isReportReady) {
    return;
  }

  // First, ask the DB if row exists and seen=true
  checkReportSeen(guestReportId)
    .then(({ hasRow, seen }) => {
      if (hasRow && seen) {
        // Already handled; mark as ready
        console.log('[ReportListener] already ready');
        useReportReadyStore.getState().setReportReady(true);
        return;
      }

      // If no row yet, start realtime listener until an insert appears
      const startedAt = Date.now();
      useReportReadyStore.getState().startPolling();
      console.log('[ReportListener] start');
      const channel = supabase
        .channel(`report_ready_signals_${guestReportId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'report_ready_signals',
            filter: `guest_report_id=eq.${guestReportId}`,
          },
          async (_payload) => {
            try {
              await markReportSeen(guestReportId);
            } catch {}
            const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
            console.log(`[ReportListener] received after ${elapsedSec}s`);
            useReportReadyStore.getState().setReportReady(true);
            stopReportReadyOrchestration(guestReportId);
          },
        )
        .subscribe();
      console.log('[ReportListener] subscribed');
      activeChannels[guestReportId] = { channel, startedAt };
    })
    .catch(() => {
      // If ask failed for any reason, still start listener
      useReportReadyStore.getState().startPolling();
      console.log('[ReportListener] start');
      const channel = supabase
        .channel(`report_ready_signals_${guestReportId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'report_ready_signals',
            filter: `guest_report_id=eq.${guestReportId}`,
          },
          async (_payload) => {
            try {
              await markReportSeen(guestReportId);
            } catch {}
            const startedAt = activeChannels[guestReportId]?.startedAt || Date.now();
            const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
            console.log(`[ReportListener] received after ${elapsedSec}s`);
            useReportReadyStore.getState().setReportReady(true);
            stopReportReadyOrchestration(guestReportId);
          },
        )
        .subscribe();
      console.log('[ReportListener] subscribed');
      activeChannels[guestReportId] = { channel, startedAt: Date.now() };
    });
}

export function stopReportReadyOrchestration(guestReportId: string): void {
  const ref = activeChannels[guestReportId];
  if (ref) {
    try {
      ref.channel?.unsubscribe?.();
      // For older clients
      // @ts-ignore
      if (supabase.removeChannel && ref.channel) supabase.removeChannel(ref.channel);
    } catch {}
    delete activeChannels[guestReportId];
    const elapsedSec = Math.round((Date.now() - ref.startedAt) / 1000);
    console.log(`[ReportListener] stop after ${elapsedSec}s`);
    useReportReadyStore.getState().stopPolling();
  }
}


