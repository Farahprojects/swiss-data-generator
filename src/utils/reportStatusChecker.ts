type ReportType = 'essence' | 'sync';

export const isAstroOnlyType = (type?: ReportType): boolean => type === 'essence' || type === 'sync';

export const checkReportReadiness = (
  report: any,
  fetchedReportData: any,
  reportType?: ReportType
): boolean => {
  const isAstroDataOnly = isAstroOnlyType(reportType);
  
  // Check if we have edge function data with content type
  if (fetchedReportData?.metadata?.content_type) {
    const contentType = fetchedReportData.metadata.content_type;
    return contentType === 'both' || contentType === 'astro' || contentType === 'ai';
  }
  
  // Fallback to original logic
  if (isAstroDataOnly) {
    return report?.swiss_boolean === true;
  }
  
  return !!report?.has_report && !!report?.swiss_boolean;
};

export const getReportStatus = (report: any, isReady: boolean, error: string | null) => {
  if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: 'Clock' };
  if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: 'Clock' };
  if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: 'Clock' };
  if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: 'CheckCircle' };
  return { title: '', desc: 'Please wait', icon: 'Clock' };
};