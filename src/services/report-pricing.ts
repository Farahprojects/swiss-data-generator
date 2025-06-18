
import { getProductByName } from '@/utils/stripe-products';

export const getReportPriceAndDescription = async (reportType: string, relationshipType?: string, essenceType?: string) => {
  const baseDescriptions = {
    'sync': 'Sync Compatibility Report',
    'essence': 'Personal Essence Report',
    'flow': 'Life Flow Analysis Report',
    'mindset': 'Mindset Transformation Report',
    'monthly': 'Monthly Astrology Forecast',
    'focus': 'Life Focus Guidance Report',
  };

  let description = baseDescriptions[reportType as keyof typeof baseDescriptions] || 'Astrology Report';
  
  if (relationshipType) {
    description += ` (${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Focus)`;
  }
  if (essenceType) {
    description += ` - ${essenceType.charAt(0).toUpperCase() + essenceType.slice(1)} Analysis`;
  }

  const reportTypeToProductName = {
    'sync': 'Sync',
    'essence': 'Essence',
    'flow': 'Flow',
    'mindset': 'Mindset',
    'monthly': 'Monthly',
    'focus': 'Focus',
  };

  const productName = reportTypeToProductName[reportType as keyof typeof reportTypeToProductName];
  
  if (!productName) {
    throw new Error(`Unknown report type: ${reportType}`);
  }

  const product = await getProductByName(productName);
  if (!product) {
    throw new Error(`Product not found in database: ${productName}`);
  }

  return { 
    amount: product.amount_usd, 
    description: product.description || description 
  };
};

export const buildCompleteReportType = (reportType: string, essenceType?: string, relationshipType?: string) => {
  console.log('Building report type with data:', {
    reportType,
    essenceType,
    relationshipType
  });
  
  if (reportType === 'essence' && essenceType) {
    const completeType = `essence_${essenceType}`;
    console.log('Built complete essence type:', completeType);
    return completeType;
  }
  if (reportType === 'sync' && relationshipType) {
    const completeType = `sync_${relationshipType}`;
    console.log('Built complete sync type:', completeType);
    return completeType;
  }
  console.log('Using base report type:', reportType);
  return reportType;
};
