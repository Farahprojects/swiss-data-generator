/**
 * App initialization - Connect WebSocket early and keep it hot
 * This ensures fast message fetching without cold start delays
 */

import { useMessageStore } from './messageStore';

/**
 * Initialize the app with early WebSocket connection
 * Call this on app startup, not on every message send
 */
export const initializeApp = async () => {
  console.log('[AppInit] Initializing early WebSocket connection...');
  
  try {
    // Initialize WebSocket early and keep it hot
    await useMessageStore.getState().initializeWebSocket();
    console.log('[AppInit] WebSocket initialized successfully');
  } catch (error: any) {
    console.warn('[AppInit] WebSocket initialization failed:', error.message);
    // Don't throw - app can still work with direct Supabase fallback
  }
};

/**
 * Initialize when the app loads
 * This runs once when the app starts, not on every message
 */
if (typeof window !== 'undefined') {
  // Initialize on page load
  initializeApp();
}
