import { supabase } from '@/integrations/supabase/client';
import { useReportReadyStore } from './reportReadyStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logUserError } from '@/services/errorService';

// Track active listeners to prevent duplicates
const activeListeners: Record<string, { 
  channel: RealtimeChannel; 
  startedAt: number; 
  timeoutId?: NodeJS.Timeout;
  pollingTimeoutId?: NodeJS.Timeout; // Track polling timeouts separately
}> = {};

// Trigger context injection for chat when report is ready
async function triggerContextInjection(guestReportId: string): Promise<void> {
  try {
    const response = await supabase.functions.invoke('context-injector', {
      body: { guest_report_id: guestReportId }
    });

    if (response.error) {
      console.error('[ReportReady] Context injection failed:', response.error);
    }
  } catch (error) {
    console.error('[ReportReady] Error triggering context injection:', error);
  }
}

// Check if report exists in report_ready_signals table
export async function checkReportSeen(guestReportId: string): Promise<{ hasRow: boolean; seen: boolean }> {
  try {
    const { data, error } = await supabase
      .from('report_ready_signals')
      .select('guest_report_id, seen')
      .eq('guest_report_id', guestReportId)
      .limit(1);

    if (error) {
      console.error('[ReportReady] Error checking report seen:', error);
      return { hasRow: false, seen: false };
    }

    const hasRow = data && data.length > 0;
    const seen = hasRow && data[0].seen;
    
    return { hasRow, seen };
  } catch (error) {
    console.error('[ReportReady] Exception checking report seen:', error);
    return { hasRow: false, seen: false };
  }
}

// Mark report as seen in database
export async function markReportSeen(guestReportId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('report_ready_signals')
      .update({ seen: true })
      .eq('guest_report_id', guestReportId);

    if (error) {
      console.error('[ReportReady] Error marking report seen:', error);
    }
  } catch (error) {
    console.error('[ReportReady] Exception marking report seen:', error);
  }
}

// Check report_logs for error status
async function checkReportLogsForError(guestReportId: string): Promise<{ hasError: boolean; errorMessage?: string }> {
  try {
    const { data, error } = await supabase
      .from('report_logs')
      .select('status, error_message')
      .eq('client_id', guestReportId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[ReportReady] Error checking report_logs:', error);
      return { hasError: false };
    }

    if (data && data.length > 0) {
      const latestLog = data[0];
      if (latestLog.status === 'error') {
        return { 
          hasError: true, 
          errorMessage: latestLog.error_message || 'Report generation failed'
        };
      }
    }

    return { hasError: false };
  } catch (error) {
    console.error('[ReportReady] Exception checking report_logs:', error);
    return { hasError: false };
  }
}

// Trigger error handler with popup
async function triggerErrorHandler(guestReportId: string, errorMessage: string): Promise<void> {
  try {
    console.log('[ReportReady] Triggering error handler for:', guestReportId);
    
    // Log the error using existing error service
    const caseNumber = await logUserError({
      guestReportId,
      errorType: 'report_generation_timeout',
      errorMessage: `Report generation timed out after 13 seconds. ${errorMessage}`,
      timestamp: new Date().toISOString()
    });

    // Set error state in store to trigger popup
    useReportReadyStore.getState().setErrorState({
      type: 'report_generation_timeout',
      case_number: caseNumber || `CASE-${Date.now()}`,
      message: 'Your report is taking longer than expected. We\'ve logged this issue and our team will investigate.',
      logged_at: new Date().toISOString(),
      requires_cleanup: true,
      requires_error_logging: false, // Already logged above
      guest_report_id: guestReportId
    });

  } catch (error) {
    console.error('[ReportReady] Error triggering error handler:', error);
  }
}

export function startReportReadyListener(guestReportId: string): void {
  if (!guestReportId) {
    console.warn('[ReportReady] No guestReportId provided');
    return;
  }

  // Prevent duplicate listeners
  if (activeListeners[guestReportId]) {
    console.log(`[ReportReady] Listener already exists for: ${guestReportId}, stopping existing one`);
    stopReportReadyListener(guestReportId);
  }

  // Check if report is already ready in store
  if (useReportReadyStore.getState().isReportReady) {
    return;
  }

  // First check if report already exists
  checkReportSeen(guestReportId)
    .then(({ hasRow, seen }) => {
      if (hasRow && seen) {
        // Already handled; mark as ready
        useReportReadyStore.getState().setReportReady(true);
        return;
      }

      if (hasRow && !seen) {
        // Report exists but not marked as seen yet, mark it and set ready
        markReportSeen(guestReportId).then(() => {
          useReportReadyStore.getState().setReportReady(true);
        });
        return;
      }

      // Report doesn't exist yet, set up real-time listener with 13-second timeout
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
  useReportReadyStore.getState().startPolling();

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
        // Only trigger if this is a meaningful update (not just our own seen=true update)
        if (payload.new && !payload.old) {
          handleReportReady(guestReportId, startedAt);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[ReportReady] Channel error, falling back to polling');
        fallbackToPolling(guestReportId, startedAt);
      } else if (status === 'TIMED_OUT') {
        console.warn('[ReportReady] Subscription timed out, falling back to polling');
        fallbackToPolling(guestReportId, startedAt);
      }
    });

  // Store the active listener
  activeListeners[guestReportId] = { channel, startedAt };

  // Set up 13-second timeout for intelligent error handling
  const timeoutId = setTimeout(async () => {
    if (activeListeners[guestReportId] && !useReportReadyStore.getState().isReportReady) {
      // First check if report is ready
      const { hasRow } = await checkReportSeen(guestReportId);
      
      if (hasRow) {
        handleReportReady(guestReportId, startedAt);
        return;
      }

      // Report not ready, check report_logs for error status
      const { hasError, errorMessage } = await checkReportLogsForError(guestReportId);
      
      if (hasError) {
        await triggerErrorHandler(guestReportId, errorMessage || 'Unknown error');
        stopReportReadyListener(guestReportId);
        return;
      }

      // No error found, continue with polling as fallback
      fallbackToPolling(guestReportId, startedAt);
    }
  }, 13000); // 13 seconds

  // Store timeout ID for cleanup
  activeListeners[guestReportId].timeoutId = timeoutId;
}

function handleReportReady(guestReportId: string, startedAt: number): void {
  // Set report as ready first (for UI)
  useReportReadyStore.getState().setReportReady(true);
  stopReportReadyListener(guestReportId);
  
  // Trigger context injection for chat
  triggerContextInjection(guestReportId);
}

function fallbackToPolling(guestReportId: string, startedAt: number): void {
  let attempts = 0;
  const poll = async () => {
    // Check if listener is still active before proceeding
    if (!activeListeners[guestReportId]) {
      console.log('[ReportReady] Polling stopped - listener no longer active');
      return;
    }

    attempts++;
    try {
      const { data, error } = await supabase
        .from('report_ready_signals')
        .select('guest_report_id')
        .eq('guest_report_id', guestReportId)
        .limit(1);

      if (!error && data && data.length > 0) {
        handleReportReady(guestReportId, startedAt);
        return;
      }
    } catch (error) {
      console.warn('[ReportReady] Polling error:', error);
    }

    // Continue polling if still active and under 13 seconds total
    const totalElapsed = Date.now() - startedAt;
    if (activeListeners[guestReportId] && !useReportReadyStore.getState().isReportReady && totalElapsed < 13000) {
      // Store polling timeout ID for cleanup
      const pollingTimeoutId = setTimeout(poll, 2000); // Poll every 2 seconds
      activeListeners[guestReportId].pollingTimeoutId = pollingTimeoutId;
    } else if (totalElapsed >= 13000) {
      // 13 seconds reached, check for errors
      const { hasError, errorMessage } = await checkReportLogsForError(guestReportId);
      
      if (hasError) {
        await triggerErrorHandler(guestReportId, errorMessage || 'Unknown error');
        stopReportReadyListener(guestReportId);
      } else if (activeListeners[guestReportId]) {
        // Continue polling only if still active
        const pollingTimeoutId = setTimeout(poll, 2000);
        activeListeners[guestReportId].pollingTimeoutId = pollingTimeoutId;
      }
    }
  };

  // Start polling
  poll();
}

export function stopReportReadyListener(guestReportId: string): void {
  const listener = activeListeners[guestReportId];
  if (listener) {
    console.log(`[ReportReady] Stopping listener for: ${guestReportId}`);
    
    // Clear main timeout if exists
    if (listener.timeoutId) {
      clearTimeout(listener.timeoutId);
    }
    
    // Clear polling timeout if exists
    if (listener.pollingTimeoutId) {
      clearTimeout(listener.pollingTimeoutId);
    }
    
    // Unsubscribe from real-time channel
    try {
      listener.channel.unsubscribe();
    } catch (error) {
      console.warn('[ReportReady] Error unsubscribing from channel:', error);
    }
    
    // Remove from active listeners
    delete activeListeners[guestReportId];
    
    // Update store state
    useReportReadyStore.getState().stopPolling();
    
    console.log(`[ReportReady] Listener stopped for: ${guestReportId}`);
  }
}

// Cleanup function for when component unmounts or user navigates away
export function cleanupAllListeners(): void {
  Object.keys(activeListeners).forEach(guestReportId => {
    stopReportReadyListener(guestReportId);
  });
}

// Export for debugging
export function getActiveListeners(): Record<string, { channel: RealtimeChannel; startedAt: number; timeoutId?: NodeJS.Timeout }> {
  return activeListeners;
}
