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
 * Clear all session data and navigate to home
 */
export const clearAllSessionData = (): void => {
  // Clear all localStorage items
  localStorage.removeItem('currentGuestReportId');
  localStorage.removeItem('reportFormData');
  localStorage.removeItem('guestReportData');
  localStorage.removeItem('formStep');
  localStorage.removeItem('paymentSession');
  localStorage.removeItem('reportProgress');
  localStorage.removeItem('guestCaseNumber');
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear URL state
  window.history.replaceState({}, '', '/');
  
  // Force navigation to home
  window.location.replace('/');
};

/**
 * Store case number associated with guest token
 */
export const storeCaseNumber = (guestToken: string, caseNumber: string): void => {
  if (!guestToken || !caseNumber) return;
  localStorage.setItem(`caseNumber_${guestToken}`, caseNumber);
  // Also store in general key for backward compatibility
  localStorage.setItem('guestCaseNumber', caseNumber);
};

/**
 * Retrieve case number associated with guest token
 */
export const getCaseNumber = (guestToken?: string): string | null => {
  const token = guestToken || getGuestToken();
  if (!token) return localStorage.getItem('guestCaseNumber');
  
  // First try token-specific storage
  const tokenSpecificCase = localStorage.getItem(`caseNumber_${token}`);
  if (tokenSpecificCase) return tokenSpecificCase;
  
  // Fallback to general storage
  return localStorage.getItem('guestCaseNumber');
};

/**
 * Clear case number for guest token
 */
export const clearCaseNumber = (guestToken?: string): void => {
  const token = guestToken || getGuestToken();
  if (token) {
    localStorage.removeItem(`caseNumber_${token}`);
  }
  localStorage.removeItem('guestCaseNumber');
};