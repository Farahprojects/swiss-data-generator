/**
 * Utility functions for detecting report types and handling Swiss-only reports
 */

export interface ReportDetectionData {
  reportContent?: string;
  swissData?: any;
  swissBoolean?: boolean;
  reportType?: string;
  hasReport?: boolean;
}

/**
 * Reliably detects if this is a Swiss-only astro report that should not show the toggle
 */
export const isSwissOnlyReport = (data: ReportDetectionData): boolean => {
  const { reportContent, swissData, swissBoolean, reportType, hasReport } = data;
  
  // Primary check: explicit swiss_boolean flag
  if (swissBoolean === true) {
    console.log('🔬 Swiss-only detected: swissBoolean = true');
    return true;
  }
  
  // Secondary check: Swiss data exists but no meaningful report content
  const hasSwissData = !!swissData;
  const hasEmptyOrNoContent = !reportContent || reportContent.trim() === '' || reportContent.trim().length < 50;
  
  if (hasSwissData && hasEmptyOrNoContent) {
    console.log('🔬 Swiss-only detected: has Swiss data but no/empty content');
    return true;
  }
  
  // Tertiary check: specific report types that are astro-only
  const astroOnlyTypes = ['essence', 'sync'];
  if (reportType && astroOnlyTypes.includes(reportType)) {
    console.log('🔬 Swiss-only detected: report type is astro-only', reportType);
    return true;
  }
  
  console.log('🔬 Not Swiss-only report:', {
    swissBoolean,
    hasSwissData,
    hasEmptyOrNoContent,
    reportType,
    contentLength: reportContent?.length || 0
  });
  
  return false;
};

/**
 * Determines if the toggle should be hidden based on report data
 */
export const shouldHideToggle = (data: ReportDetectionData): boolean => {
  return isSwissOnlyReport(data);
};

/**
 * Gets the default view for a report based on its data
 */
export const getDefaultView = (data: ReportDetectionData): 'report' | 'astro' => {
  return isSwissOnlyReport(data) ? 'astro' : 'report';
};