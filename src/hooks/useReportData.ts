import { supabase } from '@/integrations/supabase/client';
import { ReportData } from '@/utils/reportContentExtraction';
import { useState, useCallback } from 'react';

export const useReportData = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (guestReportId: string | null) => {
    if (!guestReportId) {
      setError("No report ID provided.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      // Directly invoke the edge function without checking report_ready_signals
      const { data: report, error: functionError } = await supabase.functions.invoke(
        'get-report-data',
        { body: { guest_report_id: guestReportId } }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      // DETAILED LOGGING: What we got vs what we expected
      console.log('🔍 [useReportData] RAW RESPONSE from get-report-data:', report);
      console.log('🔍 [useReportData] REPORT.DATA structure:', report?.data);
      
      if (report?.data) {
        console.log('🔍 [useReportData] FIELD NAMES WE GOT:', Object.keys(report.data));
        
        if (report.data.guest_report) {
          console.log('🔍 [useReportData] GUEST_REPORT FIELDS WE GOT:', Object.keys(report.data.guest_report));
        } else {
          console.error('❌ [useReportData] MISSING guest_report field');
        }
        
        if (report.data.metadata) {
          console.log('🔍 [useReportData] METADATA FIELDS WE GOT:', Object.keys(report.data.metadata));
        } else {
          console.error('❌ [useReportData] MISSING metadata field');
        }
        
        console.log('🔍 [useReportData] FIELD NAMES WE EXPECTED: [guest_report, report_content, swiss_data, metadata]');
        console.log('🔍 [useReportData] GUEST_REPORT FIELDS WE EXPECTED: [id, email, report_type, is_ai_report, created_at, payment_status, report_data]');
        console.log('🔍 [useReportData] METADATA FIELDS WE EXPECTED: [content_type, has_ai_report, has_swiss_data, is_ready]');
        
        // Check for null/undefined values
        console.log('🔍 [useReportData] NULL/UNDEFINED CHECK:');
        console.log('  - guest_report:', report.data.guest_report ? 'Present' : 'NULL/UNDEFINED');
        console.log('  - report_content:', report.data.report_content ? 'Present' : 'NULL/UNDEFINED');
        console.log('  - swiss_data:', report.data.swiss_data ? 'Present' : 'NULL/UNDEFINED');
        console.log('  - metadata:', report.data.metadata ? 'Present' : 'NULL/UNDEFINED');
      } else {
        console.error('❌ [useReportData] CRITICAL: report.data is null/undefined');
      }

      setReportData(report.data as ReportData);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { reportData, isLoading, error, fetchReport };
};
