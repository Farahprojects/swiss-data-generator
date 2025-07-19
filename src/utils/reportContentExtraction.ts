
// Content extraction helpers for raw report data
export interface ReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    swiss_boolean: boolean | null;
    is_ai_report: boolean;
    payment_status: string;
    created_at: string;
    promo_code_used: string | null;
    report_data: any;
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    is_astro_report: boolean;
    is_ai_report: boolean;
    content_type: 'astro' | 'ai' | 'both' | 'none';
  };
}

export const extractReportContent = (reportData: ReportData): string => {
  return reportData.report_content || '';
};

export const getPersonName = (reportData: ReportData): string => {
  return reportData.guest_report?.report_data?.name || 'Unknown';
};

export const getReportTitle = (reportData: ReportData): string => {
  const personA = reportData.guest_report?.report_data?.name;
  const personB = reportData.guest_report?.report_data?.secondPersonName;
  const reportType = reportData.guest_report?.report_type || '';
  
  if (personB) {
    return `${personA} × ${personB}`;
  }
  
  return `${personA} – ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
};
