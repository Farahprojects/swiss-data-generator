
import { useState, useEffect } from 'react';
import { fetchReportPrice } from '@/services/pricing';
import { ReportFormData } from '@/types/public-report';

interface UsePriceFetchProps {
  reportType: string;
  essenceType?: string;
  relationshipType?: string;
  reportCategory?: string;
  reportSubCategory?: string;
}

export const usePriceFetch = (formData: UsePriceFetchProps) => {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!formData.reportType) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedPrice = await fetchReportPrice(formData);
        setPrice(fetchedPrice);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch price');
        console.error('Error fetching price:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [
    formData.reportType,
    formData.essenceType,
    formData.relationshipType,
    formData.reportCategory,
    formData.reportSubCategory
  ]);

  return { price, isLoading, error };
};
