import { useState, useCallback } from 'react';
import { logUserError } from '@/utils/errorHandler';

export const useErrorHandling = () => {
  const [error, setError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  const triggerError = useCallback(async (
    guestReportId?: string,
    errorType: string = 'timeout_no_report',
    errorMessage?: string,
    email?: string
  ) => {
    console.log('🚨 Triggering error:', { guestReportId, errorType, errorMessage });
    const case_number = await logUserError(
      guestReportId || '',
      errorType,
      errorMessage || 'Report not found after timeout',
      email
    );
    
    if (case_number) setCaseNumber(case_number);
    setError('We are looking into this issue. Please reference your case number if you contact support.');
  }, []);

  const clearError = useCallback(() => {
    console.log('✅ Clearing error state');
    setError(null);
    setCaseNumber(null);
  }, []);

  // Auto-clear error when it should be cleared
  const clearErrorOnReady = useCallback(() => {
    if (error) {
      console.log('🔄 Auto-clearing error because report is ready');
      clearError();
    }
  }, [error, clearError]);

  return {
    error,
    caseNumber,
    triggerError,
    clearError,
    clearErrorOnReady,
    setError,
    setCaseNumber
  };
};