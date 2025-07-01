
// Legacy pricing service - now replaced by PricingContext
// This file is kept for reference and backward compatibility

export { usePriceFetch } from '@/hooks/usePriceFetch';

// Re-export types for backward compatibility
export type ReportTypeMapping = {
  reportType: string;
  essenceType?: string;
  relationshipType?: string;
  reportCategory?: string;
  reportSubCategory?: string;
};

// Legacy function - now deprecated, use usePriceFetch hook instead
export const fetchReportPrice = async (formData: ReportTypeMapping): Promise<number> => {
  console.warn('⚠️ fetchReportPrice is deprecated. Please use usePriceFetch hook instead.');
  throw new Error('fetchReportPrice is deprecated. Please use usePriceFetch hook instead.');
};

// Get report title based on form data
export const getReportTitle = (formData: ReportTypeMapping): string => {
  const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory } = formData;
  
  if (reportType === 'essence') {
    switch (essenceType) {
      case 'professional': return 'Professional Essence Report';
      case 'relational': return 'Relational Essence Report';
      case 'personal': return 'Personal Essence Report';
      default: return 'Personal Essence Report';
    }
  }
  
  if (reportType === 'sync' || reportType === 'compatibility') {
    switch (relationshipType) {
      case 'professional': return 'Professional Compatibility Report';
      case 'personal': return 'Personal Compatibility Report';
      default: return 'Personal Compatibility Report';
    }
  }
  
  if (reportCategory === 'snapshot') {
    switch (reportSubCategory) {
      case 'focus': return 'Focus Snapshot Report';
      case 'monthly': return 'Monthly Energy Report';
      case 'mindset': return 'Mindset Report';
      default: return 'Focus Snapshot Report';
    }
  }
  
  // Fallback based on report type
  const reportTitles: Record<string, string> = {
    natal: 'Natal Report',
    compatibility: 'Compatibility Report',
    essence: 'Essence Report',
    flow: 'Flow Report',
    mindset: 'Mindset Report',
    monthly: 'Monthly Forecast',
    focus: 'Focus Report',
    sync: 'Sync Report'
  };
  
  return reportTitles[reportType] || 'Personal Report';
};

// Hook for pricing with caching
export const usePricing = () => {
  const calculatePricing = (basePrice: number, promoValidation: any) => {
    if (promoValidation.status === 'none' || promoValidation.status === 'invalid') {
      return {
        basePrice,
        discount: 0,
        discountPercent: 0,
        finalPrice: basePrice,
        isFree: false
      };
    }

    const discountPercent = promoValidation.discountPercent;
    const discount = basePrice * (discountPercent / 100);
    const finalPrice = basePrice - discount;
    
    return {
      basePrice,
      discount,
      discountPercent,
      finalPrice: Math.max(0, finalPrice),
      isFree: discountPercent === 100
    };
  };

  return { calculatePricing };
};
