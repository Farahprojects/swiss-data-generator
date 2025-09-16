/**
 * App initialization - Connect WebSocket early and keep it hot
 * This ensures fast message fetching without cold start delays
 */

import { useMessageStore } from './messageStore';

/**
 * App initialization - WebSocket will be initialized when chat session starts
 * No early WebSocket connection needed
 */
export const initializeApp = async () => {
  console.log('[AppInit] App initialized - WebSocket will connect when chat session starts');
  // WebSocket initialization moved to when chat_id is available
};

/**
 * Initialize when the app loads
 */
if (typeof window !== 'undefined') {
  // Initialize on page load
  initializeApp();
}
