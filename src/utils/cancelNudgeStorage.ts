const NUDGE_STORAGE_PREFIX = 'cancel_nudge:';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Check if we should show the cancel nudge for a given guest_id
 * Returns true if we haven't shown it in the last 7 days
 */
export const shouldShowCancelNudge = (guestId: string): boolean => {
  try {
    const key = `${NUDGE_STORAGE_PREFIX}${guestId}`;
    const storedTimestamp = localStorage.getItem(key);
    
    if (!storedTimestamp) {
      return true; // Never shown before
    }
    
    const timestamp = parseInt(storedTimestamp, 10);
    const now = Date.now();
    const timeDiff = now - timestamp;
    
    return timeDiff > SEVEN_DAYS_MS;
  } catch (error) {
    // If localStorage is not available or any error occurs, show the nudge
    console.warn('Error checking cancel nudge storage:', error);
    return true;
  }
};

/**
 * Mark that we've shown the cancel nudge for this guest_id
 */
export const markNudgeShown = (guestId: string): void => {
  try {
    const key = `${NUDGE_STORAGE_PREFIX}${guestId}`;
    const timestamp = Date.now().toString();
    localStorage.setItem(key, timestamp);
  } catch (error) {
    console.warn('Error storing cancel nudge timestamp:', error);
  }
};

/**
 * Clear the cancel nudge storage for a specific guest_id (for testing)
 */
export const clearNudgeStorage = (guestId: string): void => {
  try {
    const key = `${NUDGE_STORAGE_PREFIX}${guestId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Error clearing cancel nudge storage:', error);
  }
};