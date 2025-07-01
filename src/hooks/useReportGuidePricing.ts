
import { useState, useEffect } from 'react';
import { fetchReportPrice } from '@/services/pricing';

interface ReportGuidePricing {
  [key: string]: number | null;
}

export const useReportGuidePricing = () => {
  const [pricing, setPricing] = useState<ReportGuidePricing>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch prices for all report types used in the guide
        const pricePromises = [
          // Essence reports (all subtypes have same price, so we fetch one)
          fetchReportPrice({ reportType: 'essence', essenceType: 'personal' }),
          // Sync reports (all subtypes have same price, so we fetch one)
          fetchReportPrice({ reportType: 'sync', relationshipType: 'personal' }),
          // Individual snapshot reports
          fetchReportPrice({ reportType: 'focus' }),
          fetchReportPrice({ reportType: 'monthly' }),
          fetchReportPrice({ reportType: 'mindset' }),
          fetchReportPrice({ reportType: 'flow' }),
        ];

        const [essencePrice, syncPrice, focusPrice, monthlyPrice, mindsetPrice, flowPrice] = await Promise.all(pricePromises);

        setPricing({
          essence: essencePrice,
          sync: syncPrice,
          focus: focusPrice,
          monthly: monthlyPrice,
          mindset: mindsetPrice,
          flow: flowPrice,
        });
      } catch (err) {
        console.error('Error fetching report guide pricing:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch pricing');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPrices();
  }, []);

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Contact us';
    return `$${Math.round(price)}`;
  };

  return {
    pricing,
    isLoading,
    error,
    formatPrice,
  };
};
