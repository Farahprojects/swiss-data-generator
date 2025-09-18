import { useEffect, useCallback } from 'react';
import { sessionManager } from '@/utils/sessionManager';

/**
 * Hook to provide easy access to SessionManager functionality
 */
export const useSessionManager = (componentId: string) => {
  const registerStateReset = useCallback((callback: () => void) => {
    sessionManager.registerStateReset(componentId, callback);
  }, [componentId]);

  const unregisterStateReset = useCallback(() => {
    sessionManager.unregisterStateReset(componentId);
  }, [componentId]);

  const clearSession = useCallback(async (options?: {
    showProgress?: boolean;
    redirectTo?: string;
    preserveNavigation?: boolean;
  }) => {
    return sessionManager.clearSession(options);
  }, []);

  const getSessionStatus = useCallback(() => {
    return sessionManager.getSessionStatus();
  }, []);

  // Auto-unregister on unmount
  useEffect(() => {
    return () => {
      sessionManager.unregisterStateReset(componentId);
    };
  }, [componentId]);

  return {
    registerStateReset,
    unregisterStateReset,
    clearSession,
    getSessionStatus
  };
}; 