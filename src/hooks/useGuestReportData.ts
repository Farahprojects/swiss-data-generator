
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GuestReportResponse, GuestReportData } from '@/types/api-responses';
import { GuestReportError } from '@/utils/errors';

export const useGuestReportData = (reportId: string | null) => {
  return useQuery({
    queryKey: ['guest-report-data', reportId],
    enabled: !!reportId,
    retry: (failureCount, error) => {
      // Only retry if it's a retryable error and we haven't exceeded max attempts
      if (error instanceof GuestReportError) {
        return error.isRetryable() && failureCount < 3;
      }
      // Retry network/platform errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    queryFn: async (): Promise<GuestReportData> => {
      if (!reportId) {
        throw new GuestReportError(
          'MISSING_ID',
          'No report ID provided',
          ['Please provide a valid report ID']
        );
      }
      
      console.log(`🔍 [useGuestReportData] Fetching report for ID: ${reportId}`);
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke<GuestReportResponse>(
        'get-guest-report',
        { body: { id: reportId } }
      );
      
      // Check for network/platform errors (Supabase couldn't run the function)
      if (error) {
        console.error('❌ [useGuestReportData] Platform error:', error);
        throw new GuestReportError(
          'PLATFORM_ERROR', 
          `Platform error: ${error.message}`,
          ['Try refreshing the page', 'Check your internet connection']
        );
      }
      
      // Check for business logic errors (function ran but returned failure)
      if (!data || !data.success) {
        console.error('❌ [useGuestReportData] Business logic error:', data);
        
        const errorData = data as any; // Type assertion since we know it's an error response
        throw new GuestReportError(
          errorData.code || 'UNKNOWN_ERROR',
          errorData.message || 'An unknown error occurred',
          errorData.suggestions,
          errorData.context
        );
      }
      
      // Success case
      console.log('✅ [useGuestReportData] Successfully fetched report data');
      return data.data;
    }
  });
};
