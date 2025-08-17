
// Content extraction helpers for raw report data
// This matches the exact structure returned by get-report-data edge function
export interface ReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    is_ai_report: boolean | null;
    created_at: string;
    payment_status: string;
    report_data: any;
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    content_type: 'astro' | 'ai' | 'both' | 'none';
    has_ai_report: boolean;
    has_swiss_data: boolean;
    is_ready: boolean;
  };
}

// Type for the complete get-report-data edge function response
export interface GetReportDataResponse {
  ok: boolean;
  ready: boolean;
  data: ReportData;
}

export const extractReportContent = (reportData: ReportData): string => {
  console.log('[extractReportContent] Input reportData:', reportData);
  if (!reportData) {
    console.error('[extractReportContent] reportData is null/undefined');
    return '';
  }
  console.log('[extractReportContent] Extracting report_content:', reportData.report_content);
  return reportData.report_content || '';
};

export const getPersonName = (reportData: ReportData | null): string => {
  if (!reportData) return 'Report';
  const reportDataObj = reportData.guest_report?.report_data;
  return reportDataObj?.person_a?.name || reportDataObj?.name || 'Unknown';
};

export const getReportTitle = (reportData: ReportData): string => {
  const reportDataObj = reportData.guest_report?.report_data;
  const personA = reportDataObj?.person_a?.name || reportDataObj?.name;
  const personB = reportDataObj?.person_b?.name || reportDataObj?.secondPersonName;
  const reportType = reportData.guest_report?.report_type || '';
  
  if (personB) {
    return `${personA} × ${personB}`;
  }
  
  return `${personA} – ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
};
