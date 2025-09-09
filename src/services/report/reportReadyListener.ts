import { supabase } from '@/integrations/supabase/client';
import { useReportReadyStore } from './reportReadyStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logUserError } from '@/services/errorService';

// Track active listeners to prevent duplicates (WebSocket-based)
const activeListeners: Record<string, { 
  channel: RealtimeChannel; 
  startedAt: number; 
  timeoutId?: NodeJS.Timeout;
  pollingTimeoutId?: NodeJS.Timeout; // Track polling timeouts separately
}> = {};

// Trigger context injection for chat when report is ready
async function triggerContextInjection(chatId: string): Promise<void> {
  
  try {
    const { data: contextData, error: contextError } = await supabase.functions.invoke('context-injector', {
      body: { chat_id: chatId }
    });

    if (contextError) {
      console.error('[ReportReady] ❌ Context injection failed:', contextError);
      return;
    }

    
    // Set report ready state in store for persistence
    useReportReadyStore.getState().setReportReady(true);
    console.log('[ReportReady] 📊 Report ready state set in store');
    
    // Show success message to user
    console.log('[ReportReady] 🎯 Astro data successfully injected into chat!');
    
  } catch (error) {
    console.error('[ReportReady] ❌ Context injection error:', error);
  }
}

// Check if report exists in report_ready_signals table
export async function checkReportSeen(chatId: string): Promise<{ hasRow: boolean; seen: boolean }> {
  try {
    const { data, error } = await supabase
      .from('report_ready_signals')
      .select('chat_id, seen')
      .eq('chat_id', chatId)
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
export async function markReportSeen(chatId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('report_ready_signals')
      .update({ seen: true })
      .eq('chat_id', chatId);

    if (error) {
      console.error('[ReportReady] Error marking report seen:', error);
    }
  } catch (error) {
    console.error('[ReportReady] Exception marking report seen:', error);
  }
}

// Check report_logs for error status
async function checkReportLogsForError(chatId: string): Promise<{ hasError: boolean; errorMessage?: string }> {
  try {
    const { data, error } = await supabase
      .from('report_logs')
      .select('status, error_message')
      .eq('user_id', chatId)
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
async function triggerErrorHandler(chatId: string, errorMessage: string): Promise<void> {
  try {
    console.log('[ReportReady] Triggering error handler for chat_id:', chatId);
    
    // Log the error using existing error service
    const caseNumber = await logUserError({
      chatId,
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
      chat_id: chatId
    });

  } catch (error) {
    console.error('[ReportReady] Error triggering error handler:', error);
  }
}

export function startReportReadyListener(chatId: string): void {
  if (!chatId) {
    console.warn('[ReportReady] No chatId provided');
    return;
  }

  // Prevent duplicate listeners
  if (activeListeners[chatId]) {
    stopReportReadyListener(chatId);
  }

  // Check if report is already ready in store
  if (useReportReadyStore.getState().isReportReady) {
    return;
  }

  // First check if report already exists
  checkReportSeen(chatId)
    .then(({ hasRow, seen }) => {
      if (hasRow && seen) {
        // Already handled; mark as ready
        useReportReadyStore.getState().setReportReady(true);
        return;
      }

      if (hasRow && !seen) {
        // Report exists but not marked as seen yet, mark it and set ready
        markReportSeen(chatId).then(() => {
          useReportReadyStore.getState().setReportReady(true);
        });
        return;
      }

      // Report doesn't exist yet, set up real-time listener with 13-second timeout
      setupRealtimeListener(chatId);
    })
    .catch((error) => {
      console.warn('[ReportReady] Error checking existing report, setting up listener anyway:', error);
      setupRealtimeListener(chatId);
    });
}

function setupRealtimeListener(chatId: string): void {
  const startedAt = Date.now();
  
  // Set listening state
  useReportReadyStore.getState().startPolling();

  // Create real-time channel
  const channel = supabase
    .channel(`report-ready-${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'report_ready_signals',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        handleReportReady(chatId, startedAt);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'report_ready_signals',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        // Only trigger if this is a meaningful update (not just our own seen=true update)
        if (payload.new && !payload.old) {
          handleReportReady(chatId, startedAt);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[ReportReady] Channel error, falling back to polling');
        fallbackToPolling(chatId, startedAt);
      } else if (status === 'TIMED_OUT') {
        console.warn('[ReportReady] Subscription timed out, falling back to polling');
        fallbackToPolling(chatId, startedAt);
      }
    });

  // Store the active listener
  activeListeners[chatId] = { channel, startedAt };

  // Set up 13-second timeout for intelligent error handling
  const timeoutId = setTimeout(async () => {
    if (activeListeners[chatId] && !useReportReadyStore.getState().isReportReady) {
      // First check if report is ready
      const { hasRow } = await checkReportSeen(chatId);
      
      if (hasRow) {
        handleReportReady(chatId, startedAt);
        return;
      }

      // Report not ready, check report_logs for error status
      const { hasError, errorMessage } = await checkReportLogsForError(chatId);
      
      if (hasError) {
        await triggerErrorHandler(chatId, errorMessage || 'Unknown error');
        stopReportReadyListener(chatId);
        return;
      }

      // No error found, continue with polling as fallback (will stop at 15 seconds total)
      fallbackToPolling(chatId, startedAt);
    }
  }, 13000); // 13 seconds

  // Store timeout ID for cleanup
  activeListeners[chatId].timeoutId = timeoutId;
}

function handleReportReady(chatId: string, startedAt: number): void {
  // Set report as ready first (for UI)
  useReportReadyStore.getState().setReportReady(true);
  stopReportReadyListener(chatId);
  
  // Trigger context injection for chat
  triggerContextInjection(chatId);
}

function fallbackToPolling(chatId: string, startedAt: number): void {
  console.log('[ReportReady] WebSocket failed, but polling fallback is disabled');
  // Polling fallback removed - WebSocket-only approach
  stopReportReadyListener(chatId);
}

export function stopReportReadyListener(chatId: string): void {
  const listener = activeListeners[chatId];
  if (listener) {
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
    delete activeListeners[chatId];
    
    // Update store state
    useReportReadyStore.getState().stopPolling();
    
    // Start polling fallback for 8 seconds before triggering error handler
    startPollingFallback(chatId);
  }
}

// Polling fallback function that checks signal table every second for 8 seconds
async function startPollingFallback(chatId: string): Promise<void> {
  // Check if report is already ready before starting polling
  if (useReportReadyStore.getState().isReportReady) {
    return;
  }
  
  let attempts = 0;
  const maxAttempts = 8; // Poll for 8 seconds
  
  const poll = async () => {
    attempts++;
    
    // Check if report became ready between attempts
    if (useReportReadyStore.getState().isReportReady) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('report_ready_signals')
        .select('chat_id')
        .eq('chat_id', chatId)
        .limit(1);

      if (!error && data && data.length > 0) {
        handleReportReady(chatId, Date.now());
        return;
      }
    } catch (error) {
      console.warn('[ReportReady] Polling fallback error:', error);
    }

    // If we haven't found the signal and haven't reached max attempts, continue polling
    if (attempts < maxAttempts) {
      setTimeout(poll, 1000); // Poll every 1 second
    } else {
      // After 8 seconds of polling, trigger error handler
      await triggerErrorHandler(chatId, 'Report generation is taking longer than expected. Please try again later.');
    }
  };

  // Start polling
  poll();
}

// Cleanup function for when component unmounts or user navigates away
export function cleanupAllListeners(): void {
  Object.keys(activeListeners).forEach(chatId => {
    stopReportReadyListener(chatId);
  });
}

// Export for debugging
export function getActiveListeners(): Record<string, { channel: RealtimeChannel; startedAt: number; timeoutId?: NodeJS.Timeout }> {
  return activeListeners;
}
