
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

  const getEssencePrice = (essenceType: string): number => {
    try {
      return getReportPrice({
        reportType: 'essence',
        essenceType: essenceType,
        reportCategory: 'the-self'
      });
    } catch (error) {
      console.error('Error getting essence price:', error);
      return 0;
    }
  };

  const getSyncPrice = (relationshipType: string): number => {
    try {
      return getReportPrice({
        reportType: 'sync',
        relationshipType: relationshipType,
        reportCategory: 'compatibility'
      });
    } catch (error) {
      console.error('Error getting sync price:', error);
      return 0;
    }
  };

  const getSnapshotPrice = (reportType: string): number => {
    try {
      return getReportPrice({
        reportType: reportType,
        reportCategory: 'snapshot',
        reportSubCategory: reportType
      });
    } catch (error) {
      console.error('Error getting snapshot price:', error);
      return 0;
    }
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(0)}`;
  };

  const pricing = {
    // Astro data prices (for compatibility)
    essence: getAstroDataPrice('essence'),
    sync: getAstroDataPrice('sync'),
    
    // Essence report prices
    essence_personal: getEssencePrice('personal'),
    essence_professional: getEssencePrice('professional'),
    essence_relational: getEssencePrice('relational'),
    
    // Sync/compatibility report prices
    sync_personal: getSyncPrice('personal'),
    sync_professional: getSyncPrice('professional'),
    
    // Snapshot report prices
    focus: getSnapshotPrice('focus'),
    mindset: getSnapshotPrice('mindset'),
    monthly: getSnapshotPrice('monthly')
  };

  return {
    pricing,
    getAstroDataPrice,
    formatPrice,
    isLoading,
    error
  };
};
