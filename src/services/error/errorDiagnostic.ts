import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticRequest {
  guest_report_id: string;
  case_number?: string;
}

export interface DiagnosticResponse {
  status: 'success' | 'error' | 'report_found' | 'processing' | 'failed';
  message: string;
  report_ready?: boolean;
  report_logs_status?: string;
  should_show_error?: boolean;
  case_number?: string;
}

export class ErrorDiagnosticService {
  /**
   * Run diagnostic on error state to determine the best course of action
   */
  static async runDiagnostic(request: DiagnosticRequest): Promise<DiagnosticResponse> {
    try {
      console.log('[ErrorDiagnostic] Starting diagnostic for:', request.guest_report_id);
      
      const { data, error } = await supabase.functions.invoke('error-handler-diagnostic', {
        body: request
      });

      if (error) {
        console.error('[ErrorDiagnostic] Edge function error:', error);
        throw new Error(`Diagnostic failed: ${error.message}`);
      }

      if (data?.error) {
        console.error('[ErrorDiagnostic] Edge function returned error:', data.error);
        throw new Error(`Diagnostic error: ${data.error}`);
      }

      console.log('[ErrorDiagnostic] Diagnostic result:', data);
      return data as DiagnosticResponse;

    } catch (error) {
      console.error('[ErrorDiagnostic] Service error:', error);
      throw error;
    }
  }

  /**
   * Handle the diagnostic response and trigger appropriate actions
   */
  static async handleDiagnosticResponse(
    response: DiagnosticResponse, 
    guestReportId: string,
    onReportFound?: () => void,
    onError?: (message: string) => void
  ): Promise<void> {
    console.log('[ErrorDiagnostic] Handling response:', response.status);

    switch (response.status) {
      case 'report_found':
        console.log('[ErrorDiagnostic] Report found, triggering load');
        onReportFound?.();
        break;

      case 'success':
        console.log('[ErrorDiagnostic] Report was successful, triggering load');
        onReportFound?.();
        break;

      case 'processing':
        console.log('[ErrorDiagnostic] Report still processing');
        // Could implement retry logic here
        break;

      case 'failed':
      case 'error':
        console.log('[ErrorDiagnostic] Report failed or error occurred');
        onError?.(response.message);
        break;

      default:
        console.warn('[ErrorDiagnostic] Unknown status:', response.status);
        onError?.('Unknown error occurred');
    }
  }
}
