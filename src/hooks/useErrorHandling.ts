
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logUserError, LogErrorPayload } from '@/services/errorService';

export const useErrorHandling = () => {
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  const logErrorMutation = useMutation({
    mutationFn: logUserError,
    onSuccess: (result) => {
      if (result) {
        setCaseNumber(result);
      }
    },
  });

  const handleError = async (payload: LogErrorPayload) => {
    if (caseNumber) return; // Already have a case number
    
    logErrorMutation.mutate(payload);
  };

  return {
    caseNumber,
    setCaseNumber,
    handleError,
    isLogging: logErrorMutation.isPending,
  };
};
