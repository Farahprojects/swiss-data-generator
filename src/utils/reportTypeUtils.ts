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
 * Validates if content is meaningful (not empty/error)
 */
const hasValidContent = (content?: string): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.length > 50 && !trimmed.toLowerCase().includes('error');
};

/**
 * Determines the actual content type based on available data
 */
export const getReportContentType = (data: ReportDetectionData): ReportContentType => {
  // Use hasReport flag (now properly sourced from is_ai_report) to determine content type
  if (data.hasReport) return 'hybrid'; // AI + Astro (Astro always assumed present)
  return 'astro-only'; // Only Astro is shown if no AI content
};

/**
 * Returns intelligent toggle display logic based on actual content
 */
export const getToggleDisplayLogic = (data: ReportDetectionData): ToggleDisplayLogic => {
  const contentType = getReportContentType(data);

  if (contentType === 'hybrid') {
    return {
      showToggle: true,
      defaultView: 'report',
      title: 'Your Report',
      availableViews: ['report', 'astro']
    };
  }

  // If no AI report, just show Astro data
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
