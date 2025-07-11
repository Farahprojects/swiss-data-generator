
import { z } from 'zod';
import { useMemo, useCallback } from 'react';
import { usePricing } from '@/contexts/PricingContext';

// Zod schema for report type mapping
const ReportTypeMappingSchema = z.object({
  reportType: z.string().optional().nullable(),
  essenceType: z.string().optional(),
  relationshipType: z.string().optional(),
  reportCategory: z.string().optional(),
  reportSubCategory: z.string().optional(),
  request: z.string().optional(),
});

export type ReportTypeMapping = z.infer<typeof ReportTypeMappingSchema>;

// Simple function to extract price_list identifier from form data
const getProductId = (data: ReportTypeMapping): string => {
  // Frontend should pass the correct price_list.id directly
  // This is a simplified version that expects the frontend to provide the product ID
  return data.reportType || data.request || '';
};

// Custom hook for getting report price using context
export const usePriceFetch = () => {
  const { getPriceById, getPriceByReportType, isLoading, error } = usePricing();

  const getReportPrice = useCallback((formData: ReportTypeMapping): number => {
    try {
      // Validate input data
      const validatedData = ReportTypeMappingSchema.parse(formData);
      
      // Get product ID from form data
      const priceId = getProductId(validatedData);
      
      if (!priceId) {
        throw new Error('No price identifier could be determined from form data');
      }
      
      // Get price by ID from price_list
      const priceData = getPriceById(priceId);
      
      if (!priceData) {
        // Silenced: Only log in development mode since this can be expected behavior
        if (process.env.NODE_ENV === 'development') {
          console.debug('Price lookup failed for:', priceId);
        }
        throw new Error(`Price not found for report type: ${priceId}`);
      }
      
      return Number(priceData.unit_price_usd);
      
    } catch (error) {
      console.error('❌ Error in getReportPrice:', error);
      throw error;
    }
  }, [getPriceById, getPriceByReportType]);

  const getReportTitle = useCallback((formData: ReportTypeMapping): string => {
    const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory, request } = formData;
    
    // Handle astro data based on request field
    if (request && !reportType) {
      switch (request) {
        case 'essence': return 'The Self - Astro Data';
        case 'sync': return 'Compatibility - Astro Data';
        default: return 'Astro Data Report';
      }
    }
    
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
    
    if (reportCategory === 'astro-data') {
      switch (request) {
        case 'essence': return 'The Self - Astro Data';
        case 'sync': return 'Compatibility - Astro Data';
        default: return 'Astro Data Report';
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
  }, []);

  const calculatePricing = useCallback((basePrice: number, promoValidation: any) => {
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
  }, []);

  return useMemo(() => ({ 
    getReportPrice, 
    getReportTitle, 
    calculatePricing, 
    isLoading, 
    error 
  }), [getReportPrice, getReportTitle, calculatePricing, isLoading, error]);
};
