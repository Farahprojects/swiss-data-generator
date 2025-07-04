
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

// Map form data to price_list identifiers
const mapReportTypeToId = (data: ReportTypeMapping): string => {
  const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory, request } = data;
  
  console.log('🔍 mapReportTypeToId - Input data:', data);
  
  // Handle astro data based on request field (new logic)
  if (request && !reportType) {
    console.log('🔍 mapReportTypeToId - Using request field:', request);
    if (request === 'essence') return 'essence';
    if (request === 'sync') return 'sync';
  }
  
  // Handle essence reports
  if (reportType === 'essence') {
    if (essenceType) {
      const mappedId = `essence_${essenceType}`;
      console.log('🔍 mapReportTypeToId - Mapped essence report:', mappedId);
      return mappedId;
    } else {
      // Default to personal essence if no essenceType specified
      console.log('🔍 mapReportTypeToId - Default to personal essence');
      return 'essence_personal';
    }
  }
  
  // Handle sync/compatibility reports
  if (reportType === 'sync' || reportType === 'compatibility') {
    const relationship = relationshipType || 'personal'; // Default to personal if not specified
    const mappedId = `sync_${relationship}`;
    console.log('🔍 mapReportTypeToId - Mapped sync report:', mappedId);
    return mappedId;
  }
  
  // Handle astro data reports - map to correct price IDs
  if (reportCategory === 'astro-data' && request) {
    console.log('🔍 mapReportTypeToId - Astro data type:', request);
    return request; // essence, sync (direct mapping to price_list)
  }
  
  // Handle snapshot reports - map subcategory to actual report type
  if (reportCategory === 'snapshot' && reportSubCategory) {
    console.log('🔍 mapReportTypeToId - Snapshot subcategory:', reportSubCategory);
    return reportSubCategory; // focus, monthly, mindset
  }
  
  // Handle direct report types
  if (['focus', 'monthly', 'mindset', 'flow'].includes(reportType)) {
    console.log('🔍 mapReportTypeToId - Direct report type:', reportType);
    return reportType;
  }
  
  // Fallback to reportType
  const fallback = reportType || '';
  console.log('🔍 mapReportTypeToId - Fallback to reportType:', fallback);
  return fallback;
};

// Custom hook for getting report price using context
export const usePriceFetch = () => {
  const { getPriceById, getPriceByReportType, isLoading, error } = usePricing();

  const getReportPrice = useCallback((formData: ReportTypeMapping): number => {
    try {
      console.log('💰 getReportPrice - Starting price lookup with:', formData);
      
      // Validate input data
      const validatedData = ReportTypeMappingSchema.parse(formData);
      
      // Map to price_list identifier
      const priceId = mapReportTypeToId(validatedData);
      console.log('💰 getReportPrice - Mapped to price ID:', priceId);
      
      if (!priceId) {
        throw new Error('No price identifier could be determined from form data');
      }
      
      // Try to get price by ID first
      let priceData = getPriceById(priceId);
      console.log('💰 getReportPrice - Price by ID:', priceData);
      
      // Fallback: try by report_type
      if (!priceData) {
        console.log('💰 getReportPrice - Trying fallback by report type');
        priceData = getPriceByReportType(priceId);
        console.log('💰 getReportPrice - Price by report type:', priceData);
      }
      
      if (!priceData) {
        // Silenced: Only log in development mode since this can be expected behavior
        if (process.env.NODE_ENV === 'development') {
          console.debug('Price lookup failed for:', priceId);
        }
        throw new Error(`Price not found for report type: ${priceId}`);
      }
      
      const finalPrice = Number(priceData.unit_price_usd);
      console.log('💰 getReportPrice - Final price:', finalPrice);
      return finalPrice;
      
    } catch (error) {
      console.error('❌ Error in getReportPrice:', error);
      throw error;
    }
  }, [getPriceById, getPriceByReportType]);

  const getReportTitle = useCallback((formData: ReportTypeMapping): string => {
    const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory, request } = formData;
    
    console.log('📋 getReportTitle - Starting title lookup with:', formData);
    
    // Handle astro data based on request field
    if (request && !reportType) {
      console.log('📋 getReportTitle - Using request field for title');
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
    
    const title = reportTitles[reportType] || 'Personal Report';
    console.log('📋 getReportTitle - Final title:', title);
    return title;
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
