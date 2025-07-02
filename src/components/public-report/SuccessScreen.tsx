// 
import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (reportContent: string, reportPdfData?: string | null) => void;
  autoStartPolling?: boolean;
}

const SuccessScreen = ({ name, email, onViewReport, autoStartPolling = true }: SuccessScreenProps) => {
  const { report, isLoading, isPolling, error, startPolling, stopPolling } = useGuestReportStatus();
  const firstName = name.split(' ')[0];
  const isMobile = useIsMobile();
  const [countdown, setCountdown] = useState(24);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoCanPlay, setVideoCanPlay] = useState(false);

  // Initialize viewport height management
  useViewportHeight();

  // Auto-start polling when component mounts - simplified dependencies
  useEffect(() => {
    if (autoStartPolling && email && !isPolling) {
      startPolling(email);
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [email, autoStartPolling]); // Removed function dependencies to prevent loops

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

  // Video event handlers for debugging
  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = event.currentTarget;
    const error = videoElement.error;
    console.error('🎥 Video loading error:', {
      error: error,
      code: error?.code,
      message: error?.message,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState,
      src: videoElement.src
    });
    setVideoError(`Video failed to load: ${error?.message || 'Unknown error'}`);
    setVideoLoading(false);
  };

  const handleVideoLoadStart = () => {
    console.log('🎥 Video load started');
    setVideoLoading(true);
    setVideoError(null);
  };

  const handleVideoCanPlay = () => {
    console.log('🎥 Video can play');
    setVideoLoading(false);
    setVideoCanPlay(true);
  };

  const handleVideoLoadedData = () => {
    console.log('🎥 Video data loaded');
  };

  // Check video URL accessibility
  useEffect(() => {
    const videoUrl = "https://wrvqqvqvwqmfdqvqmaar.supabase.co/storage/v1/object/public/therai-assets/loading-video.mp4";
    console.log('🎥 Attempting to access video URL:', videoUrl);
    
    // Test if URL is accessible
    fetch(videoUrl, { method: 'HEAD' })
      .then(response => {
        console.log('🎥 Video URL accessibility check:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
      })
      .catch(error => {
        console.error('🎥 Video URL accessibility failed:', error);
      });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isReportReady && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isReportReady]);

  // Auto-redirect when report is ready
  useEffect(() => {
    if (isReportReady && onViewReport) {
      // Wait 2 seconds after report is ready to show the animation, then redirect
      const redirectTimer = setTimeout(() => {
        onViewReport(report.report_content!, report.report_pdf_data);
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isReportReady, onViewReport, report]);

  // Scroll into view on desktop to ensure visibility
  useEffect(() => {
    if (!isMobile && typeof window !== 'undefined') {
      // Small delay to ensure component is rendered
      setTimeout(() => {
        const successScreen = document.querySelector('[data-success-screen]');
        if (successScreen) {
          successScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [isMobile]);

  const handleViewReport = () => {
    if (isReportReady && onViewReport) {
      onViewReport(report.report_content!, report.report_pdf_data);
    }
  };

  const handleCreateAnother = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleRetryPolling = () => {
    if (email && !isPolling) {
      startPolling(email);
    }
  };

  // Simple loading animation component
  const LoadingAnimation = () => (
    <div className="w-full max-w-md mx-auto bg-muted/30 rounded-lg p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-sm text-muted-foreground">Generating your report...</p>
    </div>
  );

  // Desktop layout - constrained within report section
  const desktopLayout = (
    <div 
      className="w-full max-w-4xl mx-auto py-8 px-4"
      data-success-screen
    >
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          {/* Status Icon */}
          <div className="flex items-center justify-center">
            <motion.div 
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isReportReady ? 'bg-green-100' : 'bg-blue-100'
              }`}
              animate={isReportReady ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <motion.div
                animate={isReportReady ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
              </motion.div>
            </motion.div>
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

           {/* Loading content - show countdown and video when not ready */}
           {!isReportReady && (
             <div className="space-y-6">
               {/* Countdown Timer */}
               <div className="text-center">
                 <div className="text-3xl font-bold text-primary mb-2">
                   {countdown}s
                 </div>
                 <p className="text-sm text-muted-foreground">
                   Report generating...
                 </p>
               </div>

                 {/* Loading Animation */}
                 <LoadingAnimation />

                {/* Debug information */}
                {videoError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">Video Error: {videoError}</p>
                  </div>
                )}

                {/* Personal Message */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground text-center">
                    Hi {firstName}! We're working on your report and will notify you when it's ready.
                    <br />
                    <span className="font-medium">{email}</span>
                  </p>
                </div>
              </div>
            )}

           {/* Ready state message */}
           {isReportReady && (
             <div className="bg-muted/50 rounded-lg p-4">
               <p className="text-sm text-foreground text-center">
                 Hi {firstName}! Your report is ready to view. We've also sent it to your email.
               </p>
             </div>
           )}

           {/* Error Message */}
           {error && (
             <div className="bg-red-50 border border-red-200 rounded-lg p-3">
               <p className="text-sm text-red-600 mb-2">{error}</p>
               <Button 
                 onClick={handleRetryPolling}
                 variant="outline"
                 size="sm"
                 className="text-red-600 border-red-300 hover:bg-red-50"
               >
                 Retry
               </Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );

  // Mobile layout - full viewport height
  const mobileLayout = (
    <div 
      className="min-h-[calc(var(--vh,1vh)*100)] bg-gradient-to-b from-background to-muted/20 flex items-start justify-center pt-8 px-4 overflow-y-auto"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none',
        touchAction: 'manipulation'
      }}
      data-success-screen
    >
      <div className="w-full max-w-md">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-6 text-center space-y-6">
            {/* Status Icon */}
            <div className="flex items-center justify-center">
              <motion.div 
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isReportReady ? 'bg-green-100' : 'bg-blue-100'
                }`}
                animate={isReportReady ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <motion.div
                  animate={isReportReady ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
                </motion.div>
              </motion.div>
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

            {/* Loading content - show countdown and video when not ready */}
            {!isReportReady && (
              <div className="space-y-6">
                {/* Countdown Timer */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {countdown}s
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Report generating...
                  </p>
                </div>

                 {/* Loading Animation */}
                 <LoadingAnimation />

                {/* Debug information */}
                {videoError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">Video Error: {videoError}</p>
                  </div>
                )}

                {/* Personal Message */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground text-center">
                    Hi {firstName}! We're working on your report and will notify you when it's ready.
                    <br />
                    <span className="font-medium">{email}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Ready state message */}
            {isReportReady && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-foreground text-center">
                  Hi {firstName}! Your report is ready to view. We've also sent it to your email.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <Button 
                  onClick={handleRetryPolling}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return isMobile ? mobileLayout : desktopLayout;
};

export default SuccessScreen;
