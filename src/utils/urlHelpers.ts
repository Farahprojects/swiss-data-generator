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
};

/**
 * Clear guest report ID from both URL and localStorage
 */
export const clearGuestReportId = (): void => {
  localStorage.removeItem('currentGuestReportId');
  clearGuestReportIdFromUrl();
};

/**
 * Clear all session data without navigation
 */
export const clearAllSessionData = (): void => {
  // Clear all localStorage items
  localStorage.removeItem('currentGuestReportId');
  localStorage.removeItem('reportFormData');
  localStorage.removeItem('guestReportData');
  localStorage.removeItem('formStep');
  localStorage.removeItem('paymentSession');
  localStorage.removeItem('reportProgress');
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear URL state
  window.history.replaceState({}, '', '/');
};