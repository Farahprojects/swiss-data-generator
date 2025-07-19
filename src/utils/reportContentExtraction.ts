
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

export const extractAstroContent = (reportData: ReportData): string => {
  if (!reportData.swiss_data) return '';
  
  // Extract text representation of astro data
  const swissData = reportData.swiss_data;
  let astroText = '';
  
  // Add basic astro data extraction logic
  if (swissData.chart_data) {
    astroText += 'ASTROLOGICAL CHART DATA\n\n';
    
    if (swissData.chart_data.planets) {
      astroText += 'PLANETARY POSITIONS:\n';
      Object.entries(swissData.chart_data.planets).forEach(([planet, data]: [string, any]) => {
        astroText += `${planet}: ${data.sign || ''} ${data.degree || ''}°\n`;
      });
      astroText += '\n';
    }
    
    if (swissData.chart_data.houses) {
      astroText += 'HOUSE CUSPS:\n';
      Object.entries(swissData.chart_data.houses).forEach(([house, data]: [string, any]) => {
        astroText += `House ${house}: ${data.sign || ''} ${data.degree || ''}°\n`;
      });
      astroText += '\n';
    }
  }
  
  return astroText;
};

export const extractUnifiedContent = (reportData: ReportData): string => {
  const reportContent = extractReportContent(reportData);
  const astroContent = extractAstroContent(reportData);
  
  if (reportContent && astroContent) {
    return `${reportContent}\n\n--- ASTROLOGICAL DATA ---\n\n${astroContent}`;
  }
  
  return reportContent || astroContent;
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
