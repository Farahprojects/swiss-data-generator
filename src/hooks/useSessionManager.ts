import { useCallback } from 'react';
import { getCurrentSessionInfo, SessionInfo } from '@/services/auth/session';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to provide unified session management for both guest and authenticated users
 */
export const useSessionManager = () => {
  const { user, session } = useAuth();

  const getSessionInfo = useCallback((): SessionInfo => {
    return getCurrentSessionInfo();
  }, []);

  const isAuthenticated = useCallback((): boolean => {
    return !!user && !!session;
  }, [user, session]);

  const isGuest = useCallback((): boolean => {
    return !user || !session;
  }, [user, session]);

  const getCurrentUserId = useCallback((): string => {
    const sessionInfo = getCurrentSessionInfo();
    return sessionInfo.userId;
  }, []);

  const getUserType = useCallback((): 'guest' | 'authenticated' => {
    return isAuthenticated() ? 'authenticated' : 'guest';
  }, [isAuthenticated]);

  return {
    // Session info
    getSessionInfo,
    getCurrentUserId,
    getUserType,
    
    // Status checks
    isAuthenticated,
    isGuest,
    
    // Current state
    user,
    session,
  };
};