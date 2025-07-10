type ReportType = 'essence' | 'sync' | string;

export const isAstroOnlyType = (type?: ReportType): boolean => type === 'essence' || type === 'sync';

export const checkReportReadiness = (
  report: any,
  fetchedReportData: any,
  reportType?: ReportType
): boolean => {
  console.log('🔍 Checking report readiness:', { report, fetchedReportData, reportType });
  
  const isAstroDataOnly = isAstroOnlyType(reportType);
  
  // Check if we have edge function data with content type
  if (fetchedReportData?.metadata?.content_type) {
    const contentType = fetchedReportData.metadata.content_type;
    const ready = contentType === 'both' || contentType === 'astro' || contentType === 'ai';
    console.log('✅ Edge function data readiness:', { contentType, ready });
    return ready;
  }
  
  // Enhanced logic for different report types
  if (isAstroDataOnly) {
    // For essence and sync reports, check swiss_boolean
    const ready = report?.swiss_boolean === true;
    console.log('🔮 Astro report readiness:', { swiss_boolean: report?.swiss_boolean, ready });
    return ready;
  }
  
  // For AI reports (essence_personal, etc.), check has_report
  if (reportType === 'essence_personal' || reportType?.includes('personal')) {
    const ready = !!report?.has_report;
    console.log('🤖 AI report readiness:', { has_report: report?.has_report, ready });
    return ready;
  }
  
  // Default logic - both flags should be true
  const ready = !!report?.has_report && !!report?.swiss_boolean;
  console.log('📋 Default report readiness:', { has_report: report?.has_report, swiss_boolean: report?.swiss_boolean, ready });
  return ready;
};

export const getReportStatus = (report: any, isReady: boolean, error: string | null) => {
  if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: 'Clock' };
  if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: 'Clock' };
  if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: 'Clock' };
  if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: 'CheckCircle' };
  return { title: '', desc: 'Please wait', icon: 'Clock' };
};