
import { useState, useCallback } from 'react';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import { ReportData } from '@/utils/reportContentExtraction';

export const useAstroDataFetch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAstroData = useCallback(async (guestReportId: string): Promise<ReportData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Fast-track fetching astro data for:', guestReportId);
      
      // Use the existing guest report data hook's refetch function
      const { refetch } = useGuestReportData(guestReportId, false);
      const result = await refetch();

      if (result.error) {
        console.error('❌ Error fetching astro data:', result.error);
        setError('Failed to fetch astro data. Please try again.');
        return null;
      }

      if (result.data) {
        console.log('✅ Astro data fetched successfully');
        return result.data;
      }

      return null;
    } catch (err) {
      console.error('❌ Unexpected error fetching astro data:', err);
      setError('An unexpected error occurred while fetching your astro data.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchAstroData,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
