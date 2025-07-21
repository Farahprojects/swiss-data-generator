
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedError {
  ok: false;
  error: string;
  code: string;
  context?: string;
  user_message?: string;
  suggestions?: string[];
}

export const useGuestReportData = (reportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report-data', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      
      console.log(`🔍 [useGuestReportData] Fetching report for ID: ${reportId}`);
      
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { id: reportId }
      });
      
      if (error) {
        console.error('❌ [useGuestReportData] Supabase function error:', error);
        
        // Try to extract the actual error response from the edge function
        let errorResponse = null;
        try {
          // The actual error response might be in error.context or a nested structure
          if (error.context && typeof error.context === 'object') {
            errorResponse = error.context;
          }
        } catch (e) {
          console.warn('Could not parse error context:', e);
        }
        
        // If we have a structured error response, use it
        if (errorResponse && errorResponse.code) {
          const detailedError = new Error(errorResponse.user_message || errorResponse.error || error.message);
          (detailedError as any).code = errorResponse.code;
          (detailedError as any).suggestions = errorResponse.suggestions;
          (detailedError as any).context = errorResponse.context;
          throw detailedError;
        }
        
        // Fallback to generic error
        throw new Error(error.message || 'Failed to fetch report data');
      }
      
      // Check if the response indicates an error (enhanced error handling)
      if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
        const enhancedError = data as EnhancedError;
        console.error('❌ [useGuestReportData] Enhanced error response:', enhancedError);
        
        // Create a more detailed error object that the UI can use
        const detailedError = new Error(enhancedError.user_message || enhancedError.error);
        (detailedError as any).code = enhancedError.code;
        (detailedError as any).suggestions = enhancedError.suggestions;
        (detailedError as any).context = enhancedError.context;
        
        throw detailedError;
      }
      
      console.log('✅ [useGuestReportData] Successfully fetched report data');
      return data;
    },
    enabled: !!reportId,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.code === 'GUEST_REPORT_NOT_FOUND' || 
          error?.code === 'MISSING_ID' || 
          error?.code === 'INVALID_ID' ||
          error?.code === 'PAYMENT_REQUIRED') {
        return false;
      }
      
      // Retry up to 3 times for server errors or processing status
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // No polling - data will be fetched on demand via orchestrator signals
  });
};
