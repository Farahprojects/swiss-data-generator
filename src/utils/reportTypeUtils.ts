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
    return true;
  }
  
  // Secondary check: specific report types that are astro-only
  const astroOnlyTypes = ['essence', 'sync'];
  if (reportType && astroOnlyTypes.includes(reportType)) {
    return true;
  }
  
  // Tertiary check: hasReport explicitly false and Swiss data exists
  if (hasReport === false && !!swissData) {
    return true;
  }
  
  // Quaternary check: Empty/minimal report content with Swiss data
  const hasSwissData = !!swissData;
  const hasEmptyOrNoContent = !reportContent || reportContent.trim() === '' || reportContent.trim().length < 20;
  
  if (hasSwissData && hasEmptyOrNoContent) {
    return true;
  }
  
  return false;
};

/**
 * Determines if the toggle should be hidden based on report data
 * Toggle should only show when we have BOTH meaningful report content AND Swiss data
 */
export const shouldHideToggle = (data: ReportDetectionData): boolean => {
  const { reportContent, swissData } = data;
  
  // Always hide toggle for Swiss-only reports
  if (isSwissOnlyReport(data)) {
    return true;
  }
  
  // Hide toggle if we don't have both content types
  const hasMeaningfulReportContent = reportContent && reportContent.trim().length > 20;
  const hasSwissData = !!swissData;
  
  if (!hasMeaningfulReportContent || !hasSwissData) {
    return true;
  }
  
  return false;
};

/**
 * Gets the default view for a report based on its data
 */
export const getDefaultView = (data: ReportDetectionData): 'report' | 'astro' => {
  return isSwissOnlyReport(data) ? 'astro' : 'report';
};