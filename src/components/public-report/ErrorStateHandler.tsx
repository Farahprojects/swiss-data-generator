
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Home, Mail, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { clearAllSessionData } from '@/utils/urlHelpers';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { ErrorDiagnosticService, DiagnosticResponse } from '@/services/error/errorDiagnostic';
import { supabase } from '@/integrations/supabase/client';
// Removed - using system message detection instead

interface ErrorState {
  type: string;
  case_number?: string;
  message: string;
  logged_at?: string;
  requires_cleanup?: boolean;
  requires_error_logging?: boolean;
  guest_report_id?: string;
  email?: string;
}

interface ErrorStateHandlerProps {
  errorState: ErrorState;
  onTriggerErrorLogging?: (guestReportId: string, email: string) => void;
  onCleanupSession?: () => void;
}

const ErrorStateHandler: React.FC<ErrorStateHandlerProps> = ({
  errorState,
  onTriggerErrorLogging,
  onCleanupSession
}) => {
  const navigate = useNavigate();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState<string>('');
  const [showErrorHandler, setShowErrorHandler] = useState(false);

  const [isRetrying, setIsRetrying] = useState(false);

  const handleManualRetry = async () => {
    if (!errorState?.guest_report_id) return;

    setIsRetrying(true);
    setDiagnosticMessage('Checking report status...');
    
    try {
      console.log(`🚨 [ErrorStateHandler] Manual retry initiated for guest_report_id: ${errorState.guest_report_id}`);
      console.log(`🚨 [ErrorStateHandler] About to call runDiagnostic with:`, {
        guest_report_id: errorState.guest_report_id,
        case_number: errorState.case_number
      });
      
      const response = await ErrorDiagnosticService.runDiagnostic({
        guest_report_id: errorState.guest_report_id,
        case_number: errorState.case_number
      });

      await ErrorDiagnosticService.handleDiagnosticResponse(
        response,
        errorState.guest_report_id,
        // onReportFound
        async () => {
          console.log(`✅ [ErrorStateHandler] Report found! Connecting back to main flow for guest_report_id: ${errorState.guest_report_id}`);
          setDiagnosticMessage('We found your report! Loading it now...');
          
          // Mirror the handleReportReady flow from reportReadyListener.ts
          // 1. Set report as ready (triggers UI update)
          useReportReadyStore.getState().setReportReady(true);
          
          // 2. Report ready detection moved to system message detection
          
          // 3. Trigger context injection for chat
          try {
            await supabase.functions.invoke('context-injector', {
              body: { guest_report_id: errorState.guest_report_id }
            });
            console.log(`🔗 [ErrorStateHandler] Context injection triggered for guest_report_id: ${errorState.guest_report_id}`);
          } catch (error) {
            console.error('[ErrorStateHandler] Context injection failed:', error);
          }
          
          // 4. Clear error state (this will close the popup)
          useReportReadyStore.getState().setErrorState(null);
          
          console.log(`🎉 [ErrorStateHandler] Successfully reconnected flow - popup should close and report should load`);
        },
        // onError
        (message: string) => {
          setDiagnosticMessage(message);
          setShowErrorHandler(true);
        }
      );

    } catch (error) {
      console.error('[ErrorStateHandler] Manual retry failed:', error);
      setDiagnosticMessage('Still having issues. Please try again or contact support.');
      setShowErrorHandler(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReturnHome = async () => {
    console.log('🧹 Starting comprehensive session cleanup...');
    
    try {
      // Call the cleanup session function first
      if (onCleanupSession) {
        await onCleanupSession();
      }
      
      // Enhanced session cleanup
      await clearAllSessionData();
      
      // Clear chat store state
      const { clearChat } = useChatStore.getState();
      clearChat();
      
      // Clear report ready store state
      const { setErrorState, stopPolling } = useReportReadyStore.getState();
      setErrorState(null);
      stopPolling();
      
      // Additional cleanup for error states
      const errorKeys = [
        'guest_report_error',
        'report_error_state',
        'error_case_number',
        'swiss_processing_error',
        'therai_chat_id',
        'report_generation_status'
      ];
      
      errorKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear URL completely - remove all parameters
      const cleanUrl = new URL(window.location.origin + '/');
      window.history.replaceState(null, '', cleanUrl.toString());
      
      console.log('✅ Enhanced session cleanup completed');
      
      // Navigate to home
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      // Fallback: Force navigation anyway
      window.location.href = '/';
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Report Generation Issue - Case ${errorState.case_number || 'Unknown'}`);
    const body = encodeURIComponent(
      `Hello,\n\nI encountered an issue while generating my report.\n\n` +
      `Case Number: ${errorState.case_number || 'N/A'}\n` +
      `Error Type: ${errorState.type}\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `Please help me resolve this issue.\n\nThank you!`
    );
    window.open(`mailto:support@therai.ai?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <Card className="border-2 border-destructive/20 shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center gap-4 py-4">
              {isRetrying ? (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-3 tracking-tight">
                {isRetrying ? 'Checking Report Status' : 'Internet is running slow'}
              </h2>
              <p className="text-gray-600 font-light mb-4">
                {isRetrying ? diagnosticMessage : 'Press the button below and we\'ll get you back on track'}
              </p>
              
              {isRetrying && showErrorHandler && errorState.case_number && (
                <div className="bg-muted/50 rounded-lg p-4 text-sm mb-4">
                  <p className="font-medium text-gray-900 mb-1">Case Number</p>
                  <p className="text-gray-700 font-mono text-xs">{errorState.case_number}</p>
                  {errorState.logged_at && (
                    <p className="text-gray-500 text-xs mt-1">
                      Logged: {new Date(errorState.logged_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isRetrying && (
              <div className="space-y-3">
                <Button
                  onClick={handleManualRetry}
                  className="w-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  <Loader2 className="w-4 h-4 mr-2" />
                  Check Report Status
                </Button>
              </div>
            )}

            {isRetrying && showErrorHandler && (
              <div className="space-y-3">
                <Button
                  onClick={handleReturnHome}
                  className="w-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
                
                {errorState.case_number && (
                  <Button
                    onClick={handleContactSupport}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              {!isRetrying ? 'This gives us time to resolve any issues.' : 'Our team has been notified and will investigate this issue.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorStateHandler;
