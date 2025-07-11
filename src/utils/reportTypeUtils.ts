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
 * Validates if astro data contains meaningful information
 */
const hasValidAstroData = (swissData?: any): boolean => {
  if (!swissData) return false;
  if (typeof swissData === 'string' && swissData.length < 100) return false;
  if (typeof swissData === 'object') {
    const dataStr = JSON.stringify(swissData);
    return dataStr.length > 100 && !dataStr.toLowerCase().includes('error');
  }
  return true;
};

/**
 * Determines the actual content type based on available data
 */
export const getReportContentType = (data: ReportDetectionData): ReportContentType => {
  const hasValidReport = hasValidContent(data.reportContent);
  const hasValidAstro = hasValidAstroData(data.swissData);

  if (hasValidReport && hasValidAstro) return 'hybrid';
  if (hasValidAstro && !hasValidReport) return 'astro-only';
  if (hasValidReport && !hasValidAstro) return 'ai-only';
  return 'empty';
};

/**
 * Returns intelligent toggle display logic based on actual content
 */
export const getToggleDisplayLogic = (data: ReportDetectionData): ToggleDisplayLogic => {
  const contentType = getReportContentType(data);
  
  switch (contentType) {
    case 'hybrid':
      return {
        showToggle: true,
        defaultView: 'report',
        title: 'Your Report',
        availableViews: ['report', 'astro']
      };
    
    case 'astro-only':
      return {
        showToggle: false,
        defaultView: 'astro',
        title: 'Your Astro Data',
        availableViews: ['astro']
      };
    
    case 'ai-only':
      return {
        showToggle: false,
        defaultView: 'report',
        title: 'Your Report',
        availableViews: ['report']
      };
    
    case 'empty':
    default:
      return {
        showToggle: false,
        defaultView: 'report',
        title: 'Your Report',
        availableViews: []
      };
  }
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
