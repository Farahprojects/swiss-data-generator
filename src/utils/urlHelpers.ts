
/**
 * URL helper utilities for managing guest report IDs in URLs
 */

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
      .select('id, email, has_report, report_data, payment_status')
      .eq('id', token)
      .single();
    
    if (error || !data) {
      return { isValid: false, hasReport: false };
    }
    
    const reportData = data.report_data as any;
    return {
      isValid: true,
      hasReport: data.has_report || false,
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
 * Enhanced comprehensive session clearing with React Query cache
 */
export const clearAllSessionData = async (): Promise<void> => {
  try {
    // Clear React Query cache if available
    const { useQueryClient } = await import('@tanstack/react-query');
    try {
      const queryClient = useQueryClient();
      queryClient.clear();
      console.log('✅ React Query cache cleared');
    } catch (error) {
      // QueryClient not available in current context, continue
      console.log('⚠️ QueryClient not available for clearing');
    }
  } catch (error) {
    // React Query not available, continue
  }

  // Clear all localStorage items (comprehensive)
  const localStorageKeysToRemove = [
    'currentGuestReportId',
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
  
  // Clear URL state - force clean URL
  try {
    window.history.replaceState({}, '', '/');
  } catch (error) {
    // Fallback to location reset
    window.location.href = '/';
  }
  
  console.log('✅ Comprehensive session data cleared');
};
