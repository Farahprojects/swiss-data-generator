import React, { useEffect, useCallback } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (content: string, pdf?: string | null, swissData?: any, hasReport?: boolean, swissBoolean?: boolean) => void;
  guestReportId?: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ name, email, onViewReport, guestReportId }) => {
  const {
    report,
    error,
    caseNumber,
    fetchReport,
    triggerErrorHandling,
    fetchAstroData,
    fetchBothReportData,
  } = useGuestReportStatus();

  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useViewportHeight();

  // Simple ready state - only thing that matters
  const isReady =
    report?.swiss_boolean === true ||
    (report?.has_report && !!(report?.translator_log_id || report?.report_log_id));

  const handleViewReport = useCallback(async () => {
    console.log('🔘 View Report button clicked');
    
    const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
    if (!reportIdToUse || !onViewReport) {
      console.error('❌ Missing required data for view report');
      return;
    }

    // Check if this is a Swiss-only report
    const isSwissOnly = report?.swiss_boolean === true || 
                       report?.report_type === 'essence' || 
                       report?.report_type === 'sync';

    try {
      if (isSwissOnly) {
        const swissData = await fetchAstroData(reportIdToUse);
        onViewReport('', null, swissData, false, true);
      } else {
        const { reportContent, swissData } = await fetchBothReportData(reportIdToUse);
        onViewReport(
          reportContent ?? 'Report content could not be loaded', 
          null, 
          swissData,
          report?.has_report ?? true,
          report?.swiss_boolean ?? false
        );
      }
    } catch (error) {
      console.error('❌ Error in handleViewReport:', error);
    }
  }, [guestReportId, onViewReport, fetchBothReportData, fetchAstroData, report]);

  useEffect(() => {
    const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
    if (reportIdToUse) {
      fetchReport(reportIdToUse);
    }
  }, [guestReportId, fetchReport]);


  const status = (() => {
    if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: Clock };
    if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: Clock };
    if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: Clock };
    if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: CheckCircle };
    return { title: 'Processing', desc: 'Please wait', icon: Clock };
  })();

  const StatusIcon = status.icon;

  const handleTryAgain = () => navigate('/');
  const handleContactSupport = () => {
    const errorMessage = `Hi, I'm experiencing an issue with my report generation.\n\nReport Details:\n- Name: ${name}\n- Email: ${email}\n- Report ID: ${guestReportId || 'N/A'}\n- Case Number: ${caseNumber || 'N/A'}\n- Time: ${new Date().toLocaleString()}\n`;
    localStorage.setItem('contactFormPrefill', JSON.stringify({ name, email, subject: 'Report Issue', message: errorMessage }));
    navigate('/contact');
  };

  const PersonalNote = (
    <div className="bg-muted/50 rounded-lg p-4 text-sm">
      Hi {firstName}!{' '}
      {isReady
        ? "Your report is ready to view. We've also emailed it to you."
        : "We're working on your report and will notify you when it's ready."}
      <br />
      <span className="font-medium">{email}</span>
    </div>
  );

  const ErrorBlock = error && (
    <div className="max-w-xl mx-auto bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-xl p-8 shadow-md space-y-6 mt-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Clock className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-2xl font-light text-gray-900 mb-1 tracking-tight italic">
            Report Processing Issue
          </h3>
          <p className="text-gray-600 font-light">We're working to resolve this quickly</p>
        </div>
      </div>
      <div className="bg-white/80 rounded-xl p-6">
        <p className="text-base text-gray-700 font-light leading-relaxed">
          We're experiencing a delay with your report generation. Our team has been automatically notified and is working to resolve this issue.
        </p>
      </div>
      {caseNumber && (
        <div className="bg-white rounded-xl border border-red-200 p-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <p className="text-sm font-medium text-red-800">Reference Number</p>
          </div>
          <p className="text-lg font-mono text-red-900 mb-2">{caseNumber}</p>
          <p className="text-xs text-red-600">Save this reference number for faster assistance.</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button onClick={handleTryAgain} className="bg-gray-900 text-white font-light px-8 py-4 rounded-xl text-lg hover:bg-gray-800 transition-all">
          Try Again
        </Button>
        <Button variant="outline" onClick={handleContactSupport} className="border-gray-900 text-gray-900 font-light px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-all">
          Contact Support
        </Button>
      </div>
    </div>
  );

  return (
    <div data-success-screen className={isMobile ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto' : 'w-full py-10 px-4 flex justify-center'}>
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <StatusIcon className="h-6 w-6 text-gray-600" />
              </div>
              {!isReady && !error && (
                <div className="text-gray-600 font-light">Report generating...</div>
              )}
              {isReady && <div className="text-gray-600 font-light">Ready to view</div>}
              {error && <div className="text-gray-600 font-light">Processing issue detected</div>}
            </div>
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
              <p className="text-gray-600 font-light">{status.desc}</p>
            </div>
            
            {/* Error State */}
            {error && (
              <div className="text-center py-8">
                <div className="text-gray-600 font-light mb-4">
                  We've detected an issue with your report. Our team has been notified.
                </div>
                <Button onClick={handleTryAgain} className="bg-gray-900 text-white font-light">
                  Try Again
                </Button>
              </div>
            )}
            
            {/* Loading State */}
            {!isReady && !error && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                Hi {firstName}! We're working on your report.<br />
                <span className="font-medium">{email}</span>
              </div>
            )}
            
            {/* Ready State */}
            {isReady && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! Your report is ready. <br />
                  <span className="font-medium">{email}</span>
                </div>
                <Button onClick={handleViewReport} className="bg-gray-900 hover:bg-gray-800 text-white font-light">
                  View Report
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
