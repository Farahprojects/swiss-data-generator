
import { ReportPdfData } from '../types';

type ActivityLogItem = {
  id: string;
  created_at: string;
  response_status: number;
  endpoint?: string;
  request_type?: string;
  report_tier: string | null;
  total_cost_usd: number;
  processing_time_ms: number | null;
  response_payload?: any;
  request_payload?: any;
  error_message?: string;
  google_geo?: boolean;
};

export const transformLogDataToPdfData = (logData: ActivityLogItem): ReportPdfData => {
  // Extract report content
  let reportContent = 'No report content available';
  let reportTitle = 'Report';
  
  if (logData.response_payload?.report) {
    const report = logData.response_payload.report;
    
    if (typeof report === 'string') {
      reportContent = report;
    } else if (report && typeof report === 'object') {
      if ('title' in report && 'content' in report) {
        reportTitle = report.title || reportTitle;
        reportContent = report.content || reportContent;
      } else {
        reportContent = JSON.stringify(report, null, 2);
      }
    }
  }

  return {
    id: logData.id,
    title: reportTitle,
    content: reportContent,
    metadata: {
      generatedAt: new Date(logData.created_at).toLocaleString(),
      reportType: logData.report_tier ? 
        logData.report_tier.charAt(0).toUpperCase() + logData.report_tier.slice(1).toLowerCase() : 
        undefined,
      processingTime: logData.processing_time_ms ? 
        `${(logData.processing_time_ms / 1000).toFixed(2)}s` : 
        undefined,
      cost: `$${logData.total_cost_usd.toFixed(2)}`,
      status: logData.response_status
    },
    error: logData.error_message
  };
};
