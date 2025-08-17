import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';

// Guards to ensure single polling instance per UUID
const activePolls: Record<string, { timer: any; startedAt: number; attempts: number }> = {};

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
  if (activePolls[guestReportId]) return;

  // First, ask the DB if row exists and seen=true
  checkReportSeen(guestReportId)
    .then(({ hasRow, seen }) => {
      if (hasRow && seen) {
        // Already handled; nothing to do
        return;
      }

      // If no row yet, start polling until it appears
      const startedAt = Date.now();
      const pollState = { timer: null as any, startedAt, attempts: 0 };
      activePolls[guestReportId] = pollState;
      console.log('[ReportPolling] start');
      console.log('[ReportPolling] 0 0');

      const tick = async () => {
        pollState.attempts += 1;
        try {
          const { data, error } = await supabase
            .from('report_ready_signals')
            .select('guest_report_id')
            .eq('guest_report_id', guestReportId)
            .limit(1);

          const elapsedSec = Math.round((Date.now() - pollState.startedAt) / 1000);
          console.log(`[ReportPolling] ${elapsedSec} ${pollState.attempts}`);

          if (!error && data && data.length > 0) {
            // Found ready signal: mark seen, stop polling (server-side inject)
            await markReportSeen(guestReportId);
            stopReportReadyOrchestration(guestReportId);
            return;
          }
        } catch (_e) {
          // ignore and continue
        }

        // schedule next tick
        const ref = activePolls[guestReportId];
        if (ref) ref.timer = setTimeout(tick, 1000);
      };

      tick();
    })
    .catch(() => {
      // If ask failed for any reason, start polling anyway
      const startedAt = Date.now();
      const pollState = { timer: null as any, startedAt, attempts: 0 };
      activePolls[guestReportId] = pollState;
      console.log('[ReportPolling] start');
      console.log('[ReportPolling] 0 0');
      const tick = async () => {
        pollState.attempts += 1;
        const elapsedSec = Math.round((Date.now() - pollState.startedAt) / 1000);
        console.log(`[ReportPolling] ${elapsedSec} ${pollState.attempts}`);
        try {
          const { data } = await supabase
            .from('report_ready_signals')
            .select('guest_report_id')
            .eq('guest_report_id', guestReportId)
            .limit(1);
          if (data && data.length > 0) {
            await markReportSeen(guestReportId);
            stopReportReadyOrchestration(guestReportId);
            return;
          }
        } catch (_e) {}
        const ref = activePolls[guestReportId];
        if (ref) ref.timer = setTimeout(tick, 1000);
      };
      tick();
    });
}

export function stopReportReadyOrchestration(guestReportId: string): void {
  const ref = activePolls[guestReportId];
  if (ref) {
    if (ref.timer) clearTimeout(ref.timer);
    delete activePolls[guestReportId];
    const elapsedSec = Math.round((Date.now() - ref.startedAt) / 1000);
    console.log(`[ReportPolling] ${elapsedSec} ${ref.attempts}`);
    console.log('[ReportPolling] stop');
  }
}


