
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface WebsiteErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface WebsiteErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class WebsiteErrorBoundary extends React.Component<
  WebsiteErrorBoundaryProps,
  WebsiteErrorBoundaryState
> {
  constructor(props: WebsiteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): WebsiteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Website rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="mb-6">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Website Temporarily Unavailable
              </h1>
              <p className="text-gray-600 mb-6">
                We're experiencing technical difficulties. Please try again in a moment.
              </p>
            </div>
            
            <Button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Page</span>
            </Button>
            
            <p className="text-sm text-gray-500 mt-4">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
