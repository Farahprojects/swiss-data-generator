
import { InsightEntry } from '@/types/database';

export interface ClientReport {
  id: string;
  request_type: string;
  swiss_data: any;
  created_at: string;
  response_status: number;
  report_tier?: string;
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatClientNameForMobile = (fullName: string) => {
  const names = fullName.trim().split(' ');
  if (names.length === 1) return names[0];
  
  const firstName = names[0];
  const lastNameInitial = names[names.length - 1][0];
  return `${firstName} ${lastNameInitial}.`;
};

export const formatReportType = (report: ClientReport): string => {
  if (report.report_tier) {
    return report.report_tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return report.request_type || 'Report';
};

export const transformReportForDrawer = (report: ClientReport) => {
  return {
    id: report.id,
    created_at: report.created_at,
    response_status: report.response_status,
    request_type: report.request_type,
    report_tier: report.report_tier,
    total_cost_usd: 0,
    processing_time_ms: null,
    response_payload: report.swiss_data,
    request_payload: null,
    error_message: undefined,
    google_geo: false
  };
};

export const transformInsightForDrawer = (insight: InsightEntry) => {
  return {
    id: insight.id,
    created_at: insight.created_at,
    response_status: 200,
    request_type: 'insight',
    report_tier: 'insight',
    total_cost_usd: 0,
    processing_time_ms: null,
    response_payload: {
      report: insight.content
    },
    request_payload: null,
    error_message: undefined,
    google_geo: false
  };
};
