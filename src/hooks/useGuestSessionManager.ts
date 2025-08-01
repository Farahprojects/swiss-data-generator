import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { resetGuestSessionOn404 } from '@/utils/urlHelpers';
import { log } from '@/utils/logUtils';

interface GuestSessionState {
  guestId: string | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isResetting: boolean;
}

export const useGuestSessionManager = (initialGuestId?: string | null) => {
  const [state, setState] = useState<GuestSessionState>({
    guestId: initialGuestId || null,
    isLoading: false,
    hasError: false,
    errorMessage: null,
    isResetting: false,
  });

  const queryClient = useQueryClient();

  // Handle 404 errors and session reset
  const handleSessionReset = useCallback(async (reason: string = 'unknown') => {
    console.warn(`🔄 Guest session reset triggered: ${reason}`);
    
    setState(prev => ({ ...prev, isResetting: true, hasError: true, errorMessage: reason }));
    
    try {
      // Clear React Query cache
      queryClient.removeQueries({ queryKey: ['guest-report-data'] });
      queryClient.removeQueries({ queryKey: ['token-recovery'] });
      queryClient.removeQueries({ queryKey: ['guest-report-data', null] });
      
      // Comprehensive state reset
      await resetGuestSessionOn404();
      
      // Handle infinite loop prevention
      if (!sessionStorage.getItem("refreshOnce")) {
        sessionStorage.setItem("refreshOnce", "true");
        window.location.reload();
      } else {
        console.warn("Prevented infinite reload loop");
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Error during session reset:', error);
      // Fallback to homepage redirect
      window.location.href = '/';
    }
  }, [queryClient]);

  // Set guest ID and trigger loading state
  const setGuestId = useCallback((guestId: string | null) => {
    setState(prev => ({
      ...prev,
      guestId,
      isLoading: !!guestId,
      hasError: false,
      errorMessage: null,
    }));
  }, []);

  // Clear guest session (for manual resets)
  const clearGuestSession = useCallback(() => {
    setState({
      guestId: null,
      isLoading: false,
      hasError: false,
      errorMessage: null,
      isResetting: false,
    });
  }, []);

  // Initialize guest ID from URL or localStorage
  useEffect(() => {
    if (initialGuestId) {
      setGuestId(initialGuestId);
    } else {
      // Check localStorage for existing session
      const storedGuestId = localStorage.getItem('currentGuestReportId');
      if (storedGuestId) {
        setGuestId(storedGuestId);
      }
    }
  }, [initialGuestId, setGuestId]);

  return {
    // State
    guestId: state.guestId,
    isLoading: state.isLoading,
    hasError: state.hasError,
    errorMessage: state.errorMessage,
    isResetting: state.isResetting,
    
    // Actions
    setGuestId,
    clearGuestSession,
    handleSessionReset,
  };
}; 