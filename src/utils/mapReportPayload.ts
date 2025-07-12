import memoize from 'memoizee';
import { MappedReport, MappedReportSchema, RawReportPayload } from '@/types/mappedReport';

function _mapReportPayload({
  guest_report,
  report_content,
  swiss_data,
  metadata
}: RawReportPayload): MappedReport {
  // Extract person A data from guest_report.report_data (single source of truth)
  const reportData = guest_report?.report_data;
  
  if (!reportData?.name) {
    throw new Error(`Missing person A name in guest_report.report_data. Received: ${JSON.stringify(reportData)}`);
  }

  const personA = {
    name: reportData.name,
    birthDate: reportData.birthDate,
    birthTime: reportData.birthTime,
    location: reportData.birthLocation,
    latitude: reportData.birthLatitude,
    longitude: reportData.birthLongitude,
  };

  // Extract person B data (for relationships)
  const personB = reportData.secondPersonName
    ? {
        name: reportData.secondPersonName,
        birthDate: reportData.secondPersonBirthDate,
        birthTime: reportData.secondPersonBirthTime,
        location: reportData.secondPersonBirthLocation,
        latitude: reportData.secondPersonLatitude,
        longitude: reportData.secondPersonLongitude,
      }
    : undefined;

  const isRelationship = !!personB;
  const reportType = guest_report?.report_type ?? metadata?.content_type ?? reportData?.reportType ?? '';
  
  // Generate title based on relationship and report type
  const title = isRelationship 
    ? `${personA.name} × ${personB.name}`
    : `${personA.name} – ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;

  // Determine customer name (primary person for display)
  const customerName = personA.name;

  // Extract report content from various sources
  const extractedReportContent = report_content 
    || swiss_data?.report?.content 
    || swiss_data?.report
    || guest_report?.report_content
    || '';

  // Determine if this is a pure astro report (Swiss data only, no AI content)
  const isPureAstroReport = (reportType === 'essence' || reportType === 'sync') && !report_content;

  // Extract flags
  const hasReport = guest_report?.has_report ?? metadata?.is_ai_report ?? !!extractedReportContent;
  const swissBoolean = guest_report?.swiss_boolean ?? metadata?.is_astro_report ?? !!swiss_data;

  const mappedReport: MappedReport = {
    title,
    isRelationship,
    people: { 
      A: personA, 
      ...(personB && { B: personB }) 
    },
    reportContent: extractedReportContent,
    swissData: swiss_data,
    reportType,
    hasReport,
    swissBoolean,
    metadata,
    customerName,
    isPureAstroReport,
    pdfData: guest_report?.report_pdf_base64,
  };

  // Validate the mapped report with Zod
  const validated = MappedReportSchema.parse(mappedReport);
  
  // Return immutable object
  return Object.freeze(validated);
}

// Memoized version for performance
export const mapReportPayload = memoize(_mapReportPayload, {
  // Custom resolver to handle object keys for memoization
  normalizer: (args) => JSON.stringify(args[0]),
  // Cache for 5 minutes
  maxAge: 5 * 60 * 1000,
  // Maximum 100 cached results
  max: 100,
});

// Non-memoized version for testing or when fresh data is required
export const mapReportPayloadFresh = _mapReportPayload;