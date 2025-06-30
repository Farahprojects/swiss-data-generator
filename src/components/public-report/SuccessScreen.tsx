
import React, { useEffect } from 'react';
import { CheckCircle, Clock, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (reportContent: string, reportPdfData?: string | null) => void;
  autoStartPolling?: boolean;
}

const SuccessScreen = ({ name, email, onViewReport, autoStartPolling = true }: SuccessScreenProps) => {
  const { report, isLoading, isPolling, startPolling, stopPolling } = useGuestReportStatus();
  const firstName = name.split(' ')[0];

  // Auto-start polling when component mounts
  useEffect(() => {
    if (autoStartPolling && email) {
      console.log('🚀 Auto-starting report polling for:', email);
      startPolling(email);
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [email, autoStartPolling, startPolling, stopPolling]);

  const getStatusInfo = () => {
    if (!report) {
      return {
        step: 1,
        title: "Processing Your Request",
        description: "We're setting up your personalized report",
        progress: 10,
        icon: Clock,
        color: "text-blue-600"
      };
    }

    if (report.payment_status === 'pending') {
      return {
        step: 1,
        title: "Payment Processing",
        description: "Confirming your payment details",
        progress: 25,
        icon: Clock,
        color: "text-blue-600"
      };
    }

    if (report.payment_status === 'paid' && !report.has_report) {
      return {
        step: 2,
        title: "Generating Your Report",
        description: "Our AI is crafting your personalized insights",
        progress: 60,
        icon: Clock,
        color: "text-blue-600"
      };
    }

    if (report.has_report && report.report_content) {
      return {
        step: 3,
        title: "Report Ready!",
        description: "Your personalized report is complete",
        progress: 100,
        icon: CheckCircle,
        color: "text-green-600"
      };
    }

    return {
      step: 1,
      title: "Processing",
      description: "Please wait while we prepare your report",
      progress: 30,
      icon: Clock,
      color: "text-blue-600"
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const isReportReady = report?.has_report && report?.report_content;

  const handleViewReport = () => {
    if (isReportReady && onViewReport) {
      onViewReport(report.report_content!, report.report_pdf_data);
    }
  };

  const handleCreateAnother = () => {
    window.location.reload();
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-muted/20 flex items-start justify-center pt-8 px-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-6 text-center space-y-6">
            {/* Status Icon */}
            <div className="flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isReportReady ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
              </div>
            </div>
            
            {/* Status Title */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {statusInfo.title}
              </h2>
              <p className="text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={statusInfo.progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Step {statusInfo.step} of 3
              </p>
            </div>
            
            {/* Personal Message */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-foreground">
                Hi {firstName}! {isReportReady 
                  ? "Your report is ready to view. We've also sent it to your email." 
                  : isPolling 
                    ? "We're working on your report and will notify you when it's ready."
                    : "We'll send your report to"
                } 
                {!isReportReady && (
                  <span className="font-medium"> {email}</span>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isReportReady ? (
                <>
                  <Button 
                    onClick={handleViewReport}
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    <FileText className="h-4 w-4" />
                    View Your Report
                  </Button>
                  <Button 
                    onClick={handleCreateAnother}
                    variant="outline"
                    className="w-full"
                  >
                    Create Another Report
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span>Estimated time: 2-3 minutes</span>
                  </div>
                  <Button 
                    onClick={handleCreateAnother}
                    variant="outline"
                    className="w-full"
                  >
                    Create Another Report
                  </Button>
                </div>
              )}
            </div>

            {/* Polling Status */}
            {isPolling && !isReportReady && (
              <div className="text-xs text-muted-foreground border-t pt-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Checking for updates...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
