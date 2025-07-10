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
    setError(null);
    setCaseNumber(null);
  }, []);

  return {
    error,
    caseNumber,
    triggerError,
    clearError,
    setError,
    setCaseNumber
  };
};