
// Content extraction helpers for raw report data
export interface ReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    is_ai_report: boolean;
    payment_status: string;
    created_at: string;
    report_data: any;
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    content_type: 'astro' | 'ai' | 'both' | 'none';
    has_ai_report: boolean;
    has_swiss_data: boolean;
    is_ready: boolean;
    report_type: string | null;
  };
}

export const extractReportContent = (reportData: ReportData): string => {
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
