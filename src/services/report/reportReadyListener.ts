import { supabase } from '@/integrations/supabase/client';
import { useReportReadyStore } from './reportReadyStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Track active listeners to prevent duplicates
const activeListeners: Record<string, { channel: RealtimeChannel; startedAt: number }> = {};

// Trigger context injection for chat when report is ready
async function triggerContextInjection(guestReportId: string): Promise<void> {
  try {
    console.log(`[ReportReady] Triggering context injection for guest: ${guestReportId}`);
    
    const response = await supabase.functions.invoke('context-injector', {
      body: { guest_report_id: guestReportId }
    });

    if (response.error) {
      console.error('[ReportReady] Context injection failed:', response.error);
    } else {
      console.log('[ReportReady] Context injection successful:', response.data);
    }
  } catch (error) {
    console.error('[ReportReady] Error triggering context injection:', error);
  }
}

export async function checkReportSeen(guestReportId: string): Promise<{ hasRow: boolean; seen: boolean }> {
  console.log('[ReportReady] Checking existing report:', guestReportId);
  const { data, error } = await supabase
    .from('report_ready_signals')
    .select('guest_report_id, seen')
    .eq('guest_report_id', guestReportId)
    .limit(1);

  if (error) {
    console.warn('[ReportReady] Error checking report:', error);
    return { hasRow: false, seen: false };
  }

  if (data && data.length > 0) {
    const row: any = data[0];
    return { hasRow: true, seen: !!row.seen };
  }
  return { hasRow: false, seen: false };
}

export async function markReportSeen(guestReportId: string): Promise<void> {
  console.log('[ReportReady] Marking report as seen:', guestReportId);
  try {
    await supabase
      .from('report_ready_signals')
      .update({ seen: true })
      .eq('guest_report_id', guestReportId);
  } catch (error) {
    console.warn('[ReportReady] Error marking report as seen:', error);
  }
}

export function startReportReadyListener(guestReportId: string): void {
  if (!guestReportId) {
    console.warn('[ReportReady] No guestReportId provided');
    return;
  }

  // Prevent duplicate listeners
  if (activeListeners[guestReportId]) {
    console.log('[ReportReady] Listener already active for:', guestReportId);
    return;
  }

  // Check if report is already ready in store
  if (useReportReadyStore.getState().isReportReady) {
    console.log('[ReportReady] Report already marked as ready in store');
    return;
  }

  console.log('[ReportReady] Starting listener for:', guestReportId);

  // First check if report already exists
  checkReportSeen(guestReportId)
    .then(({ hasRow, seen }) => {
      if (hasRow && seen) {
        // Already handled; mark as ready
        console.log('[ReportReady] Report already exists and seen, marking ready');
        useReportReadyStore.getState().setReportReady(true);
        return;
      }

      if (hasRow && !seen) {
        // Report exists but not marked as seen yet, mark it and set ready
        console.log('[ReportReady] Report exists but not seen, marking as seen and ready');
        markReportSeen(guestReportId).then(() => {
          useReportReadyStore.getState().setReportReady(true);
        });
        return;
      }

      // Report doesn't exist yet, set up real-time listener
      console.log('[ReportReady] Setting up real-time listener for new report');
      setupRealtimeListener(guestReportId);
    })
    .catch((error) => {
      console.warn('[ReportReady] Error checking existing report, setting up listener anyway:', error);
      setupRealtimeListener(guestReportId);
    });
}

function setupRealtimeListener(guestReportId: string): void {
  const startedAt = Date.now();
  
  // Set listening state
  useReportReadyStore.getState().startPolling(); // Keep using same state prop name for compatibility

  // Create real-time channel
  const channel = supabase
    .channel(`report-ready-${guestReportId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'report_ready_signals',
        filter: `guest_report_id=eq.${guestReportId}`
      },
      (payload) => {
        console.log('[ReportReady] Real-time INSERT detected:', payload);
        handleReportReady(guestReportId, startedAt);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'report_ready_signals',
        filter: `guest_report_id=eq.${guestReportId}`
      },
      (payload) => {
        console.log('[ReportReady] Real-time UPDATE detected:', payload);
        // Only trigger if this is a meaningful update (not just our own seen=true update)
        if (payload.new && !payload.old) {
          handleReportReady(guestReportId, startedAt);
        }
      }
    )
    .subscribe((status) => {
      console.log('[ReportReady] Subscription status:', status, 'for guest:', guestReportId);
      
      if (status === 'SUBSCRIBED') {
        console.log('[ReportReady] Successfully subscribed to real-time updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[ReportReady] Channel error, falling back to polling');
        fallbackToPolling(guestReportId, startedAt);
      } else if (status === 'TIMED_OUT') {
        console.warn('[ReportReady] Subscription timed out, falling back to polling');
        fallbackToPolling(guestReportId, startedAt);
      }
    });

  // Store the active listener
  activeListeners[guestReportId] = { channel, startedAt };

  // Set up a timeout fallback in case real-time doesn't work
  setTimeout(() => {
    if (activeListeners[guestReportId] && !useReportReadyStore.getState().isReportReady) {
      console.log('[ReportReady] Timeout reached, checking report status manually');
      checkReportSeen(guestReportId).then(({ hasRow }) => {
        if (hasRow) {
          handleReportReady(guestReportId, startedAt);
        }
      });
    }
  }, 30000); // 30 second timeout
}

function handleReportReady(guestReportId: string, startedAt: number): void {
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(`[ReportReady] Report ready detected after ${elapsedSec}s for:`, guestReportId);
  
  // Set report as ready first (for UI)
  useReportReadyStore.getState().setReportReady(true);
  stopReportReadyListener(guestReportId);
  
  // Trigger context injection for chat
  triggerContextInjection(guestReportId);
  
  console.log('[ReportReady] Report marked as ready in UI, context injection triggered');
}

function fallbackToPolling(guestReportId: string, startedAt: number): void {
  console.log('[ReportReady] Falling back to polling for:', guestReportId);
  
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      const { data, error } = await supabase
        .from('report_ready_signals')
        .select('guest_report_id')
        .eq('guest_report_id', guestReportId)
        .limit(1);

      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[ReportReady] Polling attempt ${attempts} after ${elapsedSec}s`);

      if (!error && data && data.length > 0) {
        console.log(`[ReportReady] Polling detected report ready after ${elapsedSec}s`);
        handleReportReady(guestReportId, startedAt);
        return;
      }
    } catch (error) {
      console.warn('[ReportReady] Polling error:', error);
    }

    // Continue polling if still active
    if (activeListeners[guestReportId] && !useReportReadyStore.getState().isReportReady) {
      setTimeout(poll, 2000); // Poll every 2 seconds
    }
  };

  // Start polling
  poll();
}

export function stopReportReadyListener(guestReportId: string): void {
  const listener = activeListeners[guestReportId];
  if (listener) {
    const elapsedSec = Math.round((Date.now() - listener.startedAt) / 1000);
    console.log(`[ReportReady] Stopping listener after ${elapsedSec}s for:`, guestReportId);
    
    // Unsubscribe from real-time channel
    listener.channel.unsubscribe();
    
    // Remove from active listeners
    delete activeListeners[guestReportId];
    
    // Update store state
    useReportReadyStore.getState().stopPolling();
  }
}

// Cleanup function for when component unmounts or user navigates away
export function cleanupAllListeners(): void {
  console.log('[ReportReady] Cleaning up all active listeners');
  Object.keys(activeListeners).forEach(guestReportId => {
    stopReportReadyListener(guestReportId);
  });
}

// Export for debugging
export function getActiveListeners(): Record<string, { channel: RealtimeChannel; startedAt: number }> {
  return activeListeners;
}
