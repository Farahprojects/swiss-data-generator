/**
 * @deprecated This file contains the old polling-based system.
 * Use reportReadyListener.ts for new implementations with real-time listeners.
 * Kept for backward compatibility only.
 */
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from './reportReadyStore';

// Guards to ensure single polling instance per UUID
const activePolls: Record<string, { timer: any; startedAt: number; attempts: number }> = {};

export async function checkReportSeen(guestReportId: string): Promise<{ hasRow: boolean; seen: boolean }>{
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
  console.log('[ReportOrchestrator] DEPRECATED - Polling disabled, use WebSocket listener instead');
  // Polling removed - use WebSocket-based reportReadyListener instead
}

export function stopReportReadyOrchestration(guestReportId: string): void {
  const ref = activePolls[guestReportId];
  if (ref) {
    if (ref.timer) clearTimeout(ref.timer);
    delete activePolls[guestReportId];
    const elapsedSec = Math.round((Date.now() - ref.startedAt) / 1000);
    console.log(`[ReportPolling] ${elapsedSec} ${ref.attempts}`);
    console.log('[ReportPolling] stop');
    useReportReadyStore.getState().stopPolling();
  }
}


