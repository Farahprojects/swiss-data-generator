
// This service is now deprecated - use usePriceFetch hook instead
// Keeping for backward compatibility but will throw error to encourage migration

export const getReportPriceAndDescription = async (reportType: string, relationshipType?: string, essenceType?: string) => {
  console.warn('⚠️ getReportPriceAndDescription is deprecated. Please use usePriceFetch hook from PricingContext instead.');
  throw new Error('getReportPriceAndDescription is deprecated. Please use usePriceFetch hook from PricingContext instead.');
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
