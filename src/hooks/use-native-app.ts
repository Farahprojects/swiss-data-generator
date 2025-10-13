import { Capacitor } from '@capacitor/core';

/**
 * Detects if running in a native Capacitor app (iOS or Android)
 * Returns immediately - no state, no async, no race conditions
 */
export function useIsNativeApp(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}


