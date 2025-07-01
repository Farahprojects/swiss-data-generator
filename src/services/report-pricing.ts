
import { fetchReportPrice } from './pricing';

export const getReportPriceAndDescription = async (reportType: string, relationshipType?: string, essenceType?: string) => {
  // Use the shared pricing service
  const amount = await fetchReportPrice({
    reportType,
    relationshipType,
    essenceType
  });

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

  return { 
    amount, 
    description 
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
