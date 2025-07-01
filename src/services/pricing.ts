
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

// Zod schema for report type mapping
const ReportTypeMappingSchema = z.object({
  reportType: z.string(),
  essenceType: z.string().optional(),
  relationshipType: z.string().optional(),
  reportCategory: z.string().optional(),
  reportSubCategory: z.string().optional(),
});

type ReportTypeMapping = z.infer<typeof ReportTypeMappingSchema>;

// Map form data to price_list identifiers
const mapReportTypeToId = (data: ReportTypeMapping): string => {
  const { reportType, essenceType, relationshipType, reportCategory, reportSubCategory } = data;
  
  console.log('🔍 Mapping report type to ID:', { reportType, essenceType, relationshipType, reportCategory, reportSubCategory });
  
  // Handle essence reports
  if (reportType === 'essence' && essenceType) {
    const mappedId = `essence_${essenceType}`;
    console.log('🎯 Mapped essence report to:', mappedId);
    return mappedId;
  }
  
  // Handle sync/compatibility reports
  if ((reportType === 'sync' || reportType === 'compatibility') && relationshipType) {
    const mappedId = `sync_${relationshipType}`;
    console.log('🎯 Mapped sync/compatibility report to:', mappedId);
    return mappedId;
  }
  
  // Handle snapshot reports - map subcategory to actual report type
  if (reportCategory === 'snapshot' && reportSubCategory) {
    console.log('🎯 Mapped snapshot report to:', reportSubCategory);
    return reportSubCategory; // focus, monthly, mindset
  }
  
  // Handle direct report types
  if (['focus', 'monthly', 'mindset', 'flow'].includes(reportType)) {
    console.log('🎯 Mapped direct report type to:', reportType);
    return reportType;
  }
  
  // Fallback to reportType
  console.log('🎯 Using fallback mapping to:', reportType);
  return reportType;
};

// Fetch price from price_list table
export const fetchReportPrice = async (formData: ReportTypeMapping): Promise<number> => {
  try {
    // Validate input data
    const validatedData = ReportTypeMappingSchema.parse(formData);
    console.log('✅ Validated form data:', validatedData);
    
    // Map to price_list identifier
    const priceId = mapReportTypeToId(validatedData);
    console.log('🔍 Fetching price for ID:', priceId);
    
    // Query price_list table
    const { data, error } = await supabase
      .from('price_list')
      .select('unit_price_usd, name, description')
      .eq('id', priceId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching price by ID:', error);
      
      // Fallback: try by report_tier
      console.log('🔄 Trying fallback query by report_tier:', priceId);
      const { data: tierData, error: tierError } = await supabase
        .from('price_list')
        .select('unit_price_usd, name, description')
        .eq('report_tier', priceId)
        .single();
      
      if (tierError) {
        console.error('❌ Error fetching price by tier:', tierError);
        throw new Error(`Price not found for report type: ${priceId}. Please check the price_list table configuration.`);
      }
      
      console.log('✅ Found price by tier:', tierData);
      return Number(tierData.unit_price_usd);
    }
    
    console.log('✅ Found price by ID:', data);
    console.log('💰 Final price:', Number(data.unit_price_usd));
    return Number(data.unit_price_usd);
    
  } catch (error) {
    console.error('❌ Error in fetchReportPrice:', error);
    throw error; // Don't use fallback, let the error propagate
  }
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
