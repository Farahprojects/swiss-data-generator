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
  
  // Move pending report type to specific report type if it exists
  const pendingType = localStorage.getItem('pending_report_type');
  if (pendingType) {
    localStorage.setItem(`report_type_${guestReportId}`, pendingType);
    localStorage.removeItem('pending_report_type');
  }
};

/**
 * Clear guest report ID from both URL and localStorage
 */
export const clearGuestReportId = (): void => {
  localStorage.removeItem('currentGuestReportId');
  clearGuestReportIdFromUrl();
};

/**
 * Clear all session data and navigate to home
 */
export const clearAllSessionData = (): void => {
  // Clear all localStorage items except entertainment flags (preserve user experience)
  localStorage.removeItem('currentGuestReportId');
  localStorage.removeItem('reportFormData');
  localStorage.removeItem('guestReportData');
  localStorage.removeItem('formStep');
  localStorage.removeItem('paymentSession');
  localStorage.removeItem('reportProgress');
  localStorage.removeItem('autoOpenModal');
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clean up old entertainment flags (older than 24 hours) to prevent accumulation
  cleanupOldEntertainmentFlags();
  
  // Clear URL state
  window.history.replaceState({}, '', '/');
  
  // Force navigation to home
  window.location.replace('/');
};

/**
 * Clean up entertainment flags older than 24 hours to prevent localStorage bloat
 */
export const cleanupOldEntertainmentFlags = (): void => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  
  for (const key of keys) {
    if (key.startsWith('entertainment_shown_') || key.startsWith('report_type_')) {
      try {
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        if (timestamp && parseInt(timestamp) < oneDayAgo) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        } else if (!timestamp && key.startsWith('entertainment_shown_')) {
          // Add timestamp to existing entertainment flags without timestamps
          localStorage.setItem(`${key}_timestamp`, Date.now().toString());
        } else if (key.startsWith('report_type_') && !timestamp) {
          // Clean up old report_type entries without timestamps
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('Error cleaning up storage flag:', key, error);
      }
    }
  }
};

/**
 * Force clear entertainment flag for specific report (dev/testing purposes)
 */
export const clearEntertainmentFlag = (guestReportId: string): void => {
  localStorage.removeItem(`entertainment_shown_${guestReportId}`);
  localStorage.removeItem(`entertainment_shown_${guestReportId}_timestamp`);
};