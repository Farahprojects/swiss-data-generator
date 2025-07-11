/**
 * Utility functions for interpreting report types and handling Astro-only views
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
 * Determines if this report is Astro-only (Swiss) based on type
 */
export const isSwissOnlyReport = (data: ReportDetectionData): boolean => {
  const meta = getReportMeta(data.reportType || '');
  return meta.isAstroOnly;
};

/**
 * Should we hide the toggle switch? 
 * Hide toggle if report is Swiss-only (i.e., no AI content expected)
 */
export const shouldHideToggle = (data: ReportDetectionData): boolean => {
  return isSwissOnlyReport(data);
};

/**
 * Sets default view mode: 'astro' for Astro-only, otherwise 'report' (AI)
 */
export const getDefaultView = (data: ReportDetectionData): 'report' | 'astro' => {
  return isSwissOnlyReport(data) ? 'astro' : 'report';
};
