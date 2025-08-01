
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logUtils';
import { useGuestSessionManager } from './useGuestSessionManager';

interface TokenRecoveryState {
  isRecovering: boolean;
  recovered: boolean;
  error: string | null;
  recoveredName: string | null;
  recoveredEmail: string | null;
}

export const useTokenRecovery = (guestId: string | null) => {
  const { handleSessionReset } = useGuestSessionManager(guestId);
  
  const [state, setState] = useState<TokenRecoveryState>({
    isRecovering: false,
    recovered: false,
    error: null,
    recoveredName: null,
    recoveredEmail: null,
  });

  const recoverTokenData = async (guestIdParam: string) => {
    setState(prev => ({ ...prev, isRecovering: true, error: null }));
    
    try {
      const { data: guestReport, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestIdParam)
        .single();

      if (error || !guestReport) {
        // Handle 404 errors with centralized session manager
        if (error?.code === 'PGRST116' || error?.message?.includes('not found')) {
          console.warn('[useTokenRecovery] Guest report not found, delegating to session manager');
          
          // Delegate to centralized session manager
          await handleSessionReset('token_recovery_404');
          return;
        }
        
        throw new Error('Report not found');
      }

      const reportData = guestReport.report_data as any;
      const name = reportData?.name;
      const email = reportData?.email || guestReport.email;

      if (!name || !email) {
        throw new Error('Session data corrupted');
      }

      setState({
        isRecovering: false,
        recovered: true,
        error: null,
        recoveredName: name,
        recoveredEmail: email,
      });

    } catch (err: any) {
      setState({
        isRecovering: false,
        recovered: false,
        error: err.message || 'Unable to recover session',
        recoveredName: null,
        recoveredEmail: null,
      });
    }
  };

  useEffect(() => {
    if (guestId && !state.recovered && !state.isRecovering) {
      const hasExistingSession = localStorage.getItem('pending_report_email');
      
      if (hasExistingSession) {
        log('info', 'Token recovery detected', null, 'useTokenRecovery');
        recoverTokenData(guestId);
      }
    }
  }, [guestId, state.recovered, state.isRecovering]);

  const reset = () => {
    setState({
      isRecovering: false,
      recovered: false,
      error: null,
      recoveredName: null,
      recoveredEmail: null,
    });
  };

  return {
    ...state,
    recoverTokenData,
    reset
  };
};
