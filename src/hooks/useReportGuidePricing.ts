
import { usePriceFetch } from '@/hooks/usePriceFetch';

export const useReportGuidePricing = () => {
  const { getReportPrice, isLoading, error } = usePriceFetch();

  const getAstroDataPrice = (astroDataType: string): number => {
    try {
      // For astro data, use the request field instead of reportType
      return getReportPrice({ 
        request: astroDataType,
        reportType: '',
        reportCategory: 'astro-data',
        astroDataType: astroDataType
      });
    } catch (error) {
      console.error('Error getting astro data price:', error);
      return 0;
    }
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(0)}`;
  };

  const pricing = {
    essence: getAstroDataPrice('essence'),
    sync: getAstroDataPrice('sync')
  };

  return {
    pricing,
    getAstroDataPrice,
    formatPrice,
    isLoading,
    error
  };
};
