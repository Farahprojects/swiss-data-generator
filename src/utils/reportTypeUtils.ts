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

export type ReportContentType = 'hybrid' | 'astro-only' | 'ai-only' | 'empty';

export interface ToggleDisplayLogic {
  showToggle: boolean;
  defaultView: 'report' | 'astro';
  title: string;
  availableViews: ('report' | 'astro')[];
}

/**
 * Determines the actual content type based on available data
 */
export const getReportContentType = (data: ReportDetectionData): ReportContentType => {
  const hasReportContent = !!data.reportContent && data.reportContent.trim().length > 0;
  const hasSwissData = !!data.swissData;
  
  if (hasReportContent && hasSwissData) return 'hybrid';
  if (hasReportContent) return 'ai-only';
  if (hasSwissData) return 'astro-only';
  return 'empty';
};

/**
 * Simple toggle display logic - show toggle only if both report and astro data exist
 */
export const getToggleDisplayLogic = (data: ReportDetectionData): ToggleDisplayLogic => {
  const hasReportContent = !!data.reportContent && data.reportContent.trim().length > 0;
  const hasSwissData = !!data.swissData;
  
  // Simple rule: show toggle only if we have BOTH types of data
  if (hasReportContent && hasSwissData) {
    return {
      showToggle: true,
      defaultView: 'report',
      title: 'Your Report',
      availableViews: ['report', 'astro']
    };
  }

  // If only report content, show report only
  if (hasReportContent) {
    return {
      showToggle: false,
      defaultView: 'report',
      title: 'Your Report',
      availableViews: ['report']
    };
  }

  // If only astro data, show astro only
  return {
    showToggle: false,
    defaultView: 'astro',
    title: 'Your Astro Data',
    availableViews: ['astro']
  };
};

/**
 * Legacy function - determines if this report is Astro-only (Swiss) based on type
 */
export const isSwissOnlyReport = (data: ReportDetectionData): boolean => {
  const meta = getReportMeta(data.reportType || '');
  return meta.isAstroOnly;
};

/**
 * Smart toggle visibility - uses actual content detection
 */
export const shouldHideToggle = (data: ReportDetectionData): boolean => {
  const logic = getToggleDisplayLogic(data);
  return !logic.showToggle;
};

/**
 * Smart default view selection - uses actual content detection
 */
export const getDefaultView = (data: ReportDetectionData): 'report' | 'astro' => {
  const logic = getToggleDisplayLogic(data);
  return logic.defaultView;
};
