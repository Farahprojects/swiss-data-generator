
import React from 'react';
import { AlertTriangle, RefreshCw, Mail, HelpCircle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GuestReportError } from '@/utils/errors';
import { supabase } from '@/integrations/supabase/client';

interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  showRetry?: boolean;
  guestReportId?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  showRetry = true,
  guestReportId 
}) => {
  const [isLoggingError, setIsLoggingError] = React.useState(false);
  const [hasLoggedError, setHasLoggedError] = React.useState(false);

  // Handle error logging
  const handleLogError = async () => {
    if (hasLoggedError || isLoggingError) return;

    setIsLoggingError(true);
    try {
      await supabase.functions.invoke('log-user-error', {
        body: {
          guestReportId: guestReportId,
          errorType: error instanceof GuestReportError ? error.code : 'UNKNOWN_ERROR',
          errorMessage: error?.message || 'Unknown error occurred'
        }
      });
      setHasLoggedError(true);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    } finally {
      setIsLoggingError(false);
    }
  };

  const getErrorIcon = () => {
    if (error instanceof GuestReportError) {
      switch (error.code) {
        case 'GUEST_REPORT_NOT_FOUND':
          return <Mail className="h-8 w-8 text-blue-500" />;
        case 'PAYMENT_REQUIRED':
          return <HelpCircle className="h-8 w-8 text-amber-500" />;
        case 'REPORT_PROCESSING':
          return <Clock className="h-8 w-8 text-blue-500" />;
        case 'MISSING_ID':
        case 'INVALID_ID':
          return <ExternalLink className="h-8 w-8 text-red-500" />;
        default:
          return <AlertTriangle className="h-8 w-8 text-red-500" />;
      }
    }
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (error instanceof GuestReportError) {
      switch (error.code) {
        case 'GUEST_REPORT_NOT_FOUND':
          return 'Report Not Found';
        case 'PAYMENT_REQUIRED':
          return 'Payment Required';
        case 'MISSING_ID':
        case 'INVALID_ID':
          return 'Invalid Report Link';
        case 'REPORT_PROCESSING':
          return 'Report In Progress';
        case 'REPORT_GENERATION_ERROR':
          return 'Report Generation Error';
        case 'PLATFORM_ERROR':
          return 'Service Temporarily Unavailable';
        default:
          return 'Something Went Wrong';
      }
    }
    return 'Something Went Wrong';
  };

  const getErrorDescription = () => {
    if (error instanceof GuestReportError) {
      return error.getUserMessage();
    }
    return error?.message || 'An unexpected error occurred.';
  };

  const getSuggestions = () => {
    if (error instanceof GuestReportError) {
      return error.suggestions || [];
    }
    return [];
  };

  const isProcessingError = error instanceof GuestReportError && error.code === 'REPORT_PROCESSING';

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            {getErrorIcon()}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">
              {getErrorTitle()}
            </h2>
            <p className="text-gray-600">
              {getErrorDescription()}
            </p>
          </div>

          {getSuggestions().length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Try these solutions:</h3>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                {getSuggestions().map((suggestion: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            {isProcessingError ? (
              <Button onClick={() => window.location.reload()} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Check Again
              </Button>
            ) : (
              <>
                {showRetry && onRetry && (
                  <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}
                
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2"
                >
                  Go Home
                </Button>
                
                {guestReportId && !hasLoggedError && (
                  <Button 
                    onClick={handleLogError}
                    variant="outline"
                    disabled={isLoggingError}
                    className="flex items-center gap-2 text-xs"
                  >
                    {isLoggingError ? 'Reporting...' : 'Report Issue'}
                  </Button>
                )}
              </>
            )}
          </div>

          {hasLoggedError && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                ✅ Issue reported successfully. Our team has been notified.
              </p>
            </div>
          )}

          {error instanceof GuestReportError && error.code && (
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-400">
                Error Code: {error.code}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
