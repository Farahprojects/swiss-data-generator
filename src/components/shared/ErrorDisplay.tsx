
import React from 'react';
import { AlertTriangle, RefreshCw, Mail, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  showRetry = true 
}) => {
  const getErrorIcon = () => {
    if (error?.code === 'GUEST_REPORT_NOT_FOUND') return <Mail className="h-8 w-8 text-blue-500" />;
    if (error?.code === 'PAYMENT_REQUIRED') return <HelpCircle className="h-8 w-8 text-amber-500" />;
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  const getErrorTitle = () => {
    switch (error?.code) {
      case 'GUEST_REPORT_NOT_FOUND':
        return 'Report Not Found';
      case 'PAYMENT_REQUIRED':
        return 'Payment Required';
      case 'MISSING_ID':
      case 'INVALID_ID':
        return 'Invalid Report Link';
      default:
        return 'Something Went Wrong';
    }
  };

  const getErrorDescription = () => {
    return error?.message || error?.user_message || 'An unexpected error occurred.';
  };

  const getSuggestions = () => {
    return error?.suggestions || [];
  };

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

          <div className="flex gap-3 justify-center">
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
          </div>

          {error?.code && (
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
