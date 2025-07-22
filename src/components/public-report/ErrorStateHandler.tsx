
import React from 'react';
import { AlertTriangle, Home, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { clearAllSessionData } from '@/utils/urlHelpers';

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

  React.useEffect(() => {
    // Auto-trigger error logging for new errors
    if (errorState.requires_error_logging && errorState.guest_report_id && errorState.email) {
      onTriggerErrorLogging?.(errorState.guest_report_id, errorState.email);
    }
  }, [errorState, onTriggerErrorLogging]);

  const handleReturnHome = async () => {
    console.log('🧹 Starting comprehensive session cleanup...');
    
    try {
      // Enhanced session cleanup
      if (errorState.requires_cleanup || onCleanupSession) {
        await clearAllSessionData();
        
        // Additional cleanup for error states
        const errorKeys = [
          'guest_report_error',
          'report_error_state',
          'error_case_number',
          'swiss_processing_error'
        ];
        
        errorKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
        
        // Clear URL completely - remove all parameters
        const cleanUrl = new URL(window.location.origin + '/');
        window.history.replaceState(null, '', cleanUrl.toString());
        
        console.log('✅ Enhanced session cleanup completed');
      }
      
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
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md">
        <Card className="border-2 border-destructive/20 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-3 tracking-tight">
                Report Processing Issue
              </h2>
              <p className="text-gray-600 font-light mb-4">
                {errorState.message}
              </p>
              
              {errorState.case_number && (
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

            <p className="text-xs text-gray-500">
              Our team has been notified and will investigate this issue.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorStateHandler;
