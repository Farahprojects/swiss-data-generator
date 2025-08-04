
/**
 * URL helper utilities for managing guest report IDs in URLs
 */
import { log } from './logUtils';

export const URL_PARAMS = {
  GUEST_REPORT_ID: 'guest_id'
} as const;

/**
 * Get guest report ID from URL parameters
 */
export const getGuestReportIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get(URL_PARAMS.GUEST_REPORT_ID);
};

/**
 * Set guest report ID in URL without triggering navigation
 */
export const setGuestReportIdInUrl = (guestReportId: string): void => {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.set(URL_PARAMS.GUEST_REPORT_ID, guestReportId);
  
  // Update URL without triggering navigation
  window.history.replaceState({}, '', url.toString());
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
  const urlToken = new URLSearchParams(window.location.search).get('guest_id');
  if (urlToken) return urlToken;

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
      .select('id, email, has_report_log, report_data, payment_status')
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
    localStorage.removeItem("guest_payment_status");
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
 * Store guest report ID in both URL and localStorage
 */
export const storeGuestReportId = (guestReportId: string): void => {
  localStorage.setItem('currentGuestReportId', guestReportId);
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
          console.log(`✅ State reset callback ${index + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ State reset callback ${index + 1} failed:`, error);
        }
      });
    }

    // Clear React Query cache if available
    try {
      const { useQueryClient } = await import('@tanstack/react-query');
      try {
        const queryClient = useQueryClient();
        queryClient.clear();
        console.log('✅ React Query cache cleared');
      } catch (error) {
        // QueryClient not available in current context, continue
        log('warn', 'QueryClient not available for clearing', null, 'urlHelpers');
      }
    } catch (error) {
      // React Query not available, continue
      console.log('⚠️ React Query not available');
    }

    // Clear all localStorage items (comprehensive)
    const localStorageKeysToRemove = [
      'currentGuestReportId',
      'guest_payment_status',
      'guest_report_id',
      'reportFormData', 
      'guestReportData',
      'formStep',
      'paymentSession',
      'reportProgress',
      'pending_report_email',
      'mobile_drawer_state',
      'mobile_form_data'
    ];
    
    localStorageKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear pattern-based localStorage items
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('guest_report_') || 
          key.startsWith('report_') || 
          key.startsWith('mobile_') ||
          key.startsWith('drawer_') ||
          key.includes('temp_report') ||
          key.includes('chat_token')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear all sessionStorage
    sessionStorage.clear();
    
    log('info', 'Comprehensive session data cleared', null, 'urlHelpers');
    
  } catch (error) {
    console.error('❌ Error during session clearing:', error);
    throw error;
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
