/**
 * Utility functions for detecting report types and handling Swiss-only reports
 */

import { getReportMeta } from '@/constants/report-types';

export interface ReportDetectionData {
  reportContent?: string;
  swissData?: any;
  swissBoolean?: boolean;
  reportType?: string;
  hasReport?: boolean;
}

/**
 * Reliably detects if this is a Swiss-only astro report that should not show the toggle
 * Now uses clean lookup from report-types instead of heuristic logic
 */
export const isSwissOnlyReport = (data: ReportDetectionData): boolean => {
  return getReportMeta(data.reportType || '').isAstroOnly;
};

/**
 * Determines if the toggle should be hidden based on report data
 * Toggle should only show when we have BOTH meaningful report content AND Swiss data
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