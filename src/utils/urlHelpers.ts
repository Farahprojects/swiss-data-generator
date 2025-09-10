
/**
 * URL helper utilities for managing guest report IDs
 * @deprecated Most functions now use sessionStorage instead of URL parameters
 */
import { log } from './logUtils';

export const URL_PARAMS = {
  GUEST_REPORT_ID: 'guest_id'
} as const;

/**
 * Get guest report ID from sessionStorage (no longer from URL)
 */
export const getGuestReportIdFromStorage = (): string | null => {
  // Guest report ID is no longer stored in sessionStorage
  return null;
};

/**
 * Set guest report ID in sessionStorage (no longer in URL)
 */
export const setGuestReportIdInStorage = (guestReportId: string): void => {
  // Guest report ID is no longer stored in sessionStorage
  console.log(`Guest report ID: ${guestReportId} (not stored)`);
};

/**
 * @deprecated Use setGuestReportIdInStorage instead
 */
export const setGuestReportIdInUrl = (guestReportId: string): void => {
  setGuestReportIdInStorage(guestReportId);
};

/**
 * Clear guest report ID from URL
 */
export const clearGuestReportIdFromUrl = (): void => {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAMS.GUEST_REPORT_ID);
  
  // Update URL without triggering navigation
  window.history.replaceState({}, '', url.toString());
};

/**
 * Clean, production-ready token retrieval
 */
export const getGuestToken = (): string | null => {
  // Guest report ID is no longer stored in sessionStorage
  // Fallback to localStorage for backward compatibility
  return localStorage.getItem('currentGuestReportId');
};

/**
 * Validate guest token against database
 */
export const validateGuestToken = async (token: string): Promise<{ isValid: boolean; hasReport: boolean; email?: string; name?: string }> => {
  if (!token) return { isValid: false, hasReport: false };
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('guest_reports')
      .select('id, email, has_report_log, report_data')
      .eq('id', token)
      .single();
    
    if (error || !data) {
      return { isValid: false, hasReport: false };
    }
    
    const reportData = data.report_data as any;
    return {
      isValid: true,
      hasReport: data.has_report_log || false,
      email: data.email,
      name: reportData?.name
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    return { isValid: false, hasReport: false };
  }
};

/**
 * Get guest report ID from URL or localStorage, with preference for URL
 * @deprecated Use getGuestToken() instead
 */
export const getGuestReportId = (): string | null => {
  return getGuestToken();
};

/**
 * Comprehensive guest session reset for 404 errors
 * Clears all in-memory state, React Query cache, and storage
 */
export const resetGuestSessionOn404 = async (): Promise<void> => {
  console.warn('🔄 Resetting guest session due to 404 error...');
  
  try {
    // Clear all memory keys related to session or report
    localStorage.removeItem("guestId");
    localStorage.removeItem("reportUrl");
    localStorage.removeItem("pending_report_email");
    localStorage.removeItem("currentGuestReportId");
    
    localStorage.removeItem("guest_report_id");
    sessionStorage.removeItem("guestId");
    sessionStorage.removeItem("reportUrl");

    // Clear React Query cache for guest report data
    try {
      const { useQueryClient } = await import('@tanstack/react-query');
      const queryClient = useQueryClient();
      queryClient.removeQueries({ queryKey: ['guest-report-data'] });
      queryClient.removeQueries({ queryKey: ['token-recovery'] });
      queryClient.removeQueries({ queryKey: ['guest-report-data', null] });
      console.log('✅ React Query cache cleared for guest report data');
    } catch (error) {
      console.log('⚠️ React Query not available for cache clearing');
    }

    // Clear URL parameters
    clearGuestReportIdFromUrl();

    console.log('✅ Guest session reset completed');
  } catch (error) {
    console.error('❌ Error during guest session reset:', error);
  }
};

/**
 * Store guest report ID in URL only (no persistent localStorage)
 */
export const storeGuestReportId = (guestReportId: string): void => {
  setGuestReportIdInUrl(guestReportId);
};

/**
 * Clear guest report ID from both URL and localStorage
 */
export const clearGuestReportId = (): void => {
  localStorage.removeItem('currentGuestReportId');
  clearGuestReportIdFromUrl();
};

/**
 * Enhanced comprehensive session clearing with React Query cache and state reset callbacks
 */
export const clearAllSessionData = async (stateResetCallbacks?: (() => void)[]): Promise<void> => {
  log('debug', 'Starting comprehensive session clearing', null, 'urlHelpers');
  
  try {
    // Execute state reset callbacks first (before clearing storage)
    if (stateResetCallbacks && stateResetCallbacks.length > 0) {
      console.log('🔄 Executing state reset callbacks...');
      stateResetCallbacks.forEach((callback, index) => {
        try {
          callback();
          console.log(`✅ State reset callback ${index + 1} executed`);
        } catch (error) {
          console.error(`❌ State reset callback ${index + 1} failed:`, error);
        }
      });
    }

    // Clear all storage
    const storageKeys = [
      'currentGuestReportId',
      'currentGuestReportId_timestamp', // New timestamp tracking
      
      'guest_report_id',
      'last_route',
      'last_route_params',
      'modalState',
      'activeTab',
      'activeTabId', // New tab ID tracking
      'formMemoryData' // New form memory persistence
    ];

    storageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing ${key}:`, error);
      }
    });

    // Clear React Query cache more comprehensively
    try {
      const { useQueryClient } = await import('@tanstack/react-query');
      const queryClient = useQueryClient();
      
      // Clear all guest-related queries
      queryClient.removeQueries({ queryKey: ['guest-report-data'] });
      queryClient.removeQueries({ queryKey: ['token-recovery'] });
      queryClient.removeQueries({ queryKey: ['guest-report-data', null] });
      queryClient.removeQueries({ queryKey: ['temp-report-data'] });
      queryClient.removeQueries({ queryKey: ['report-data'] });
      
      // Clear any cached report payloads
      queryClient.removeQueries({ queryKey: ['report-payload'] });
      
      console.log('✅ React Query cache cleared comprehensively');
    } catch (error) {
      console.log('⚠️ React Query not available for cache clearing');
    }

    // Clear URL parameters
    clearGuestReportIdFromUrl();

    // Force garbage collection if available (Chrome only)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('🗑️ Garbage collection triggered');
      } catch (error) {
        console.log('⚠️ Garbage collection not available');
      }
    }

    console.log('✅ Comprehensive session clearing completed');
  } catch (error) {
    console.error('❌ Error during comprehensive session clearing:', error);
  }
};

/**
 * Force navigation reset with comprehensive state clearing
 */
export const forceNavigationReset = async (stateResetCallbacks?: (() => void)[]): Promise<void> => {
  console.log('🔄 Starting forced navigation reset...');
  
  try {
    // Clear all session data with state callbacks
    await clearAllSessionData(stateResetCallbacks);
    
    // Small delay to ensure clearing completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force clean URL and reload - most reliable for production
    console.log('🚀 Forcing navigation to clean state...');
    window.location.href = '/';
    
  } catch (error) {
    console.error('❌ Force navigation reset failed:', error);
    // Ultimate fallback - just navigate
    window.location.href = '/';
  }
};
