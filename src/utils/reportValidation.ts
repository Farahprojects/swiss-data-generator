import { supabase } from '@/integrations/supabase/client';
import { log } from './logUtils';

export interface ReportValidationResult {
  hasReport: boolean;
  hasPaidStatus: boolean;
  hasTranslatorLog: boolean;
  hasReportReadySignal: boolean;
  hasReportData: boolean;
  validationDetails: string;
}

/**
 * Comprehensive validation to check if a guest user has a complete report
 * Checks multiple indicators:
 * - Payment status in guest_reports
 * - translator_log_id in guest_reports (indicates report generation started)
 * - Entry in report_ready_signals (indicates report completion)
 * - Report data in report_logs table
 */
export const validateGuestReportExists = async (guestId: string): Promise<ReportValidationResult> => {
  if (!guestId) {
    return {
      hasReport: false,
      hasPaidStatus: false,
      hasTranslatorLog: false,
      hasReportReadySignal: false,
      hasReportData: false,
      validationDetails: 'No guest ID provided'
    };
  }

  try {
    log('debug', 'Starting comprehensive report validation', { guestId }, 'reportValidation');

    // Check guest_reports table for payment status and translator_log_id
    const { data: guestReport, error: guestError } = await supabase
      .from('guest_reports')
      .select('id, payment_status, translator_log_id')
      .eq('id', guestId)
      .single();

    if (guestError) {
      log('warn', 'Guest report not found in guest_reports table', { guestId, error: guestError }, 'reportValidation');
      return {
        hasReport: false,
        hasPaidStatus: false,
        hasTranslatorLog: false,
        hasReportReadySignal: false,
        hasReportData: false,
        validationDetails: 'Guest report not found'
      };
    }

    const hasPaidStatus = guestReport?.payment_status === 'paid';
    const hasTranslatorLog = !!guestReport?.translator_log_id;

    // Check report_ready_signals table
    const { data: readySignal, error: signalError } = await supabase
      .from('report_ready_signals')
      .select('id')
      .eq('guest_report_id', guestId)
      .single();

    const hasReportReadySignal = !signalError && !!readySignal;

    // Check report_logs table for actual report data
    const { data: reportLog, error: reportError } = await supabase
      .from('report_logs')
      .select('id, report_text')
      .eq('user_id', guestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const hasReportData = !reportError && !!reportLog?.report_text;

    // Determine if user has a valid report
    const hasReport = hasPaidStatus || hasTranslatorLog || hasReportReadySignal || hasReportData;

    const result: ReportValidationResult = {
      hasReport,
      hasPaidStatus,
      hasTranslatorLog,
      hasReportReadySignal,
      hasReportData,
      validationDetails: `Paid: ${hasPaidStatus}, TranslatorLog: ${hasTranslatorLog}, ReadySignal: ${hasReportReadySignal}, ReportData: ${hasReportData}`
    };

    log('info', 'Report validation completed', result, 'reportValidation');
    return result;

  } catch (error) {
    log('error', 'Error during report validation', { guestId, error }, 'reportValidation');
    return {
      hasReport: false,
      hasPaidStatus: false,
      hasTranslatorLog: false,
      hasReportReadySignal: false,
      hasReportData: false,
      validationDetails: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Check if session should be reset based on report validation
 * Only reset if user has NO indicators of having a report
 */
export const shouldResetSession = async (guestId: string): Promise<boolean> => {
  const validation = await validateGuestReportExists(guestId);
  
  // Don't reset if user has any indicators of a valid report
  if (validation.hasReport) {
    log('info', 'Session reset prevented - user has valid report', validation, 'reportValidation');
    return false;
  }

  log('info', 'Session reset allowed - no report indicators found', validation, 'reportValidation');
  return true;
};