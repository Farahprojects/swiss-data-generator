import { z } from 'zod';
import { useMemo, useCallback } from 'react';
import { usePricing } from '@/contexts/PricingContext';

// Zod schema for report type mapping
const ReportTypeMappingSchema = z.object({
  reportType: z.string(),
  essenceType: z.string().optional(),
  relationshipType: z.string().optional(),
  reportCategory: z.string().optional(),
  reportSubCategory: z.string().optional(),
  astroDataType: z.string().optional(),
  request: z.string().optional(),
});

export type ReportTypeMapping = z.infer<typeof ReportTypeMappingSchema>;

// Map form data to price_list identifiers
const mapReportTypeToId = (data: ReportTypeMapping): string => {
  const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory, astroDataType, request } = data;
  
  // Handle essence reports
  if (reportType === 'essence') {
    if (essenceType) {
      const mappedId = `essence_${essenceType}`;
      return mappedId;
    } else {
      // Default to personal essence if no essenceType specified
      return 'essence_personal';
    }
  }
  
  // Handle sync/compatibility reports
  if (reportType === 'sync' || reportType === 'compatibility') {
    const relationship = relationshipType || 'personal'; // Default to personal if not specified
    const mappedId = `sync_${relationship}`;
    return mappedId;
  }
  
  // Handle astro data reports - use the specific astro data type
  if (reportCategory === 'astro-data' && astroDataType) {
    return astroDataType; // essence, sync
  }
  
  // Handle astro data based on request field (fallback)
  if (request && !reportType) {
    if (request === 'essence') return 'essence_bundle';
    if (request === 'sync') return 'sync_rich';
  }
  
  // Handle snapshot reports - map subcategory to actual report type
  if (reportCategory === 'snapshot' && reportSubCategory) {
    return reportSubCategory; // focus, monthly, mindset
  }
  
  // Handle direct report types
  if (['focus', 'monthly', 'mindset', 'flow'].includes(reportType)) {
    return reportType;
  }
  
  // Fallback to reportType
  return reportType;
};

// Custom hook for getting report price using context
export const usePriceFetch = () => {
  const { getPriceById, getPriceByReportType, isLoading, error } = usePricing();

  const getReportPrice = useCallback((formData: ReportTypeMapping): number => {
    try {
      // Validate input data
      const validatedData = ReportTypeMappingSchema.parse(formData);
      
      // Map to price_list identifier
      const priceId = mapReportTypeToId(validatedData);
      
      // Try to get price by ID first
      let priceData = getPriceById(priceId);
      
      // Fallback: try by report_type
      if (!priceData) {
        priceData = getPriceByReportType(priceId);
      }
      
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
    const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory, astroDataType } = formData;
    
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
      switch (astroDataType) {
        case 'essence_bundle': return 'The Self - Astro Data';
        case 'sync_rich': return 'Compatibility - Astro Data';
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