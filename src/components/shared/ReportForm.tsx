import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import SuccessScreen from '@/components/public-report/SuccessScreen';
import DesktopReportViewer from '@/components/public-report/DesktopReportViewer';
import { FormValidationStatus } from '@/components/public-report/FormValidationStatus';
import { logToAdmin } from '@/utils/adminLogger';
import { clearGuestReportId, getGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportFormProps {
  coachSlug?: string;
  themeColor?: string;
  fontFamily?: string;
  onFormStateChange?: (isValid: boolean, hasSelectedType: boolean) => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ 
  coachSlug,
  themeColor = '#6366F1',
  fontFamily = 'Inter',
  onFormStateChange
}) => {
  const { promoValidation, isValidatingPromo } = usePromoValidation();
  const [viewingReport, setViewingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportPdfData, setReportPdfData] = useState<string | null>(null);
  const [swissData, setSwissData] = useState<any>(null);
  const [hasReport, setHasReport] = useState<boolean>(false);
  const [swissBoolean, setSwissBoolean] = useState<boolean>(false);
  const [currentReportType, setCurrentReportType] = useState<string>('');
  
  // Token recovery state
  const [tokenRecoveryState, setTokenRecoveryState] = useState<{
    isRecovering: boolean;
    recovered: boolean;
    error: string | null;
    recoveredName: string | null;
    recoveredEmail: string | null;
  }>({
    isRecovering: false,
    recovered: false,
    error: null,
    recoveredName: null,
    recoveredEmail: null,
  });
  
  const form = useForm<ReportFormData>({
    mode: 'onBlur',
    defaultValues: {
      reportType: '',
      reportSubCategory: '',
      relationshipType: '',
      essenceType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      birthLatitude: undefined,
      birthLongitude: undefined,
      birthPlaceId: '',
      secondPersonName: '',
      secondPersonBirthDate: '',
      secondPersonBirthTime: '',
      secondPersonBirthLocation: '',
      secondPersonLatitude: undefined,
      secondPersonLongitude: undefined,
      secondPersonPlaceId: '',
      returnYear: '',
      notes: '',
      promoCode: '',
      request: '',
    },
  });

  // Handle URL guest_id parameter for refresh support and token recovery
  React.useEffect(() => {
    const urlGuestId = getGuestReportId();
    if (urlGuestId) {
      // Attempt token recovery by fetching guest report data
      setTokenRecoveryState(prev => ({ ...prev, isRecovering: true, error: null }));
      
      const recoverTokenData = async () => {
        try {
          const { data: guestReport, error } = await supabase
            .from('guest_reports')
            .select('*')
            .eq('id', urlGuestId)
            .single();

          if (error || !guestReport) {
            throw new Error('Report not found');
          }

          // Extract name and email from report_data
          const reportData = guestReport.report_data as any;
          const name = reportData?.name;
          const email = reportData?.email || guestReport.email;

          if (!name || !email) {
            throw new Error('Session data corrupted');
          }

          setTokenRecoveryState({
            isRecovering: false,
            recovered: true,
            error: null,
            recoveredName: name,
            recoveredEmail: email,
          });

        } catch (err: any) {
          setTokenRecoveryState({
            isRecovering: false,
            recovered: false,
            error: err.message || 'Unable to recover session',
            recoveredName: null,
            recoveredEmail: null,
          });
        }
      };

      recoverTokenData();
      return;
    }
    
    // Only clear if no URL guest ID (fresh start)
    clearGuestReportId();
    localStorage.removeItem('pending_report_email');
  }, []);

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid }, formState } = form;
  const selectedReportType = watch('reportType');
  const selectedRequest = watch('request');
  const selectedReportCategory = watch('reportCategory');
  const userName = watch('name');
  const userEmail = watch('email');

  /** ------------------------------------------------------------------
   *  STEP-PROGRESS FLAGS
   *  ------------------------------------------------------------------
   *  step1Done  → user has picked a report-type OR typed a free-form request
   *  step2Done  → the key personal fields are filled in & geo-coords exist
   */
  const formValues = form.watch();
  const step1Done = Boolean(formValues.reportType || formValues.request);

  const step2Done =
    step1Done &&
    Boolean(
      formValues.name &&
        formValues.email &&
        formValues.birthDate &&
        formValues.birthTime &&
        formValues.birthLocation &&
        formValues.birthLatitude &&
        formValues.birthLongitude,
    );

  // Check if form should be unlocked (either reportType or request field filled)
  const shouldUnlockForm = !!(selectedReportType || selectedRequest);

  // Check if all key information is filled out
  React.useEffect(() => {
    const checkFormCompletion = async () => {
      const formData = form.getValues();
      const hasReportTypeOrRequest = !!(formData.reportType || formData.request);
      const hasPersonalInfo = !!(formData.name && formData.email && formData.birthDate && formData.birthTime);
      const hasLocationWithCoords = !!(formData.birthLocation && formData.birthLatitude && formData.birthLongitude);
      
      if (hasReportTypeOrRequest && hasPersonalInfo && hasLocationWithCoords) {
        await logToAdmin('ReportForm', 'payload_ready', 'All required form data collected', {
          reportType: formData.reportType,
          request: formData.request,
          name: formData.name,
          email: formData.email,
          birthDate: formData.birthDate,
          birthTime: formData.birthTime,
          birthLocation: formData.birthLocation,
          coordinates: { lat: formData.birthLatitude, lng: formData.birthLongitude }
        });
      }
      
      onFormStateChange?.(isValid, shouldUnlockForm);
    };
    
    checkFormCompletion();
  }, [form.watch(), isValid, shouldUnlockForm, onFormStateChange]);

  const { 
    isProcessing, 
    isPricingLoading, 
    reportCreated, 
    submitReport,
    showPromoConfirmation,
    pendingSubmissionData,
    handlePromoConfirmationTryAgain,
    handlePromoConfirmationContinue,
    resetReportState
  } = useReportSubmission();

  // Auto-scroll functionality for desktop
  const [lastPlaceSelectionTime, setLastPlaceSelectionTime] = React.useState<number>(0);
  const paymentStepRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to payment step when step2 is complete and place was recently selected (desktop only)
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= 768; // md breakpoint
    if (step2Done && lastPlaceSelectionTime > 0 && isDesktop) {
      const timeSinceSelection = Date.now() - lastPlaceSelectionTime;
      if (timeSinceSelection < 2000) { // Within 2 seconds of place selection
        setTimeout(() => {
          paymentStepRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 300); // Small delay to ensure DOM is updated
      }
    }
  }, [step2Done, lastPlaceSelectionTime]);

  const handlePlaceSelected = () => {
    setLastPlaceSelectionTime(Date.now());
  };

  // Check if this is a compatibility report that needs second person data
  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');
  
  const requiresSecondPerson = reportCategory === 'compatibility' || 
                               reportType?.startsWith('sync_') || 
                               request === 'sync';

  const handleViewReport = (
    content: string, 
    pdfData?: string | null, 
    swissData?: any,
    hasReport?: boolean,
    swissBoolean?: boolean,
    reportType?: string
  ) => {
    setReportContent(content);
    setReportPdfData(pdfData || null);
    setSwissData(swissData);
    setHasReport(hasReport || false);
    setSwissBoolean(swissBoolean || false);
    setCurrentReportType(reportType || '');
    setViewingReport(true);
  };

  const handleCloseReportViewer = () => {
    // Immediate hard reset with comprehensive state clearing
    setViewingReport(false);
    setReportContent('');
    setReportPdfData(null);
    setSwissData(null);
    setHasReport(false);
    setSwissBoolean(false);
    form.reset();
    clearGuestReportId();
    
    // Clear all localStorage and sessionStorage
    localStorage.removeItem('currentGuestReportId');
    localStorage.removeItem('reportFormData');
    localStorage.removeItem('guestReportData');
    localStorage.removeItem('formStep');
    localStorage.removeItem('paymentSession');
    localStorage.removeItem('reportProgress');
    localStorage.removeItem('pending_report_email');
    sessionStorage.clear();
    
    // Reset form state
    resetReportState();
    
    // Clear URL state and force immediate navigation
    window.history.replaceState({}, '', '/');
    
    // Force immediate page reload to completely reset state
    window.location.replace('/');
  };

  const onSubmit = async (data: ReportFormData) => {
    // Log payload when Review & Pay is pressed
    await logToAdmin('ReportForm', 'review_pay_pressed', 'User clicked Review & Pay - Final payload', {
      reportType: data.reportType,
      request: data.request,
      name: data.name,
      email: data.email,
      birthDate: data.birthDate,
      birthTime: data.birthTime,
      birthLocation: data.birthLocation,
      coordinates: { lat: data.birthLatitude, lng: data.birthLongitude },
      hasSecondPerson: !!(data.secondPersonName),
      promoCode: data.promoCode || 'none'
    });
    
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    
    // Convert promoValidation to the expected format
    const promoValidationState = promoValidation ? {
      status: promoValidation.isValid ? 
        (promoValidation.isFree ? 'valid-free' as const : 'valid-discount' as const) : 
        'invalid' as const,
      message: promoValidation.message,
      discountPercent: promoValidation.discountPercent,
      errorType: promoValidation.errorType
    } : {
      status: 'none' as const,
      message: '',
      discountPercent: 0
    };
    
    await submitReport(submissionData, promoValidationState, () => {});
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  // Show report viewer if user is viewing a report
  if (viewingReport && reportContent && userName) {
    return (
      <DesktopReportViewer
        reportContent={reportContent}
        reportPdfData={reportPdfData}
        customerName={userName}
        swissData={swissData}
        onBack={handleCloseReportViewer}
        hasReport={hasReport}
        swissBoolean={swissBoolean}
        reportType={currentReportType}
      />
    );
  }

  // Handle token recovery and success screen logic
  const urlGuestId = getGuestReportId();
  
  // Show success screen if report was created with valid form data
  if (reportCreated && userName && userEmail) {
    return (
      <SuccessScreen 
        name={userName} 
        email={userEmail} 
        onViewReport={handleViewReport}
        guestReportId={urlGuestId || undefined}
      />
    );
  }
  
  // Handle token recovery scenarios
  if (urlGuestId) {
    // Still recovering token data
    if (tokenRecoveryState.isRecovering) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Recovering your session...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Token recovery failed - show error
    if (tokenRecoveryState.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Session Recovery Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                {tokenRecoveryState.error === 'Report not found' && 'Report not found - please start a new report'}
                {tokenRecoveryState.error === 'Session data corrupted' && 'Session data corrupted - please start a new report'}
                {!['Report not found', 'Session data corrupted'].includes(tokenRecoveryState.error) && 'Unable to recover session - please try again'}
              </p>
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={() => {
                    clearGuestReportId();
                    window.location.replace('/');
                  }}
                  className="w-full"
                >
                  Start New Report
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Need help? Contact support with ID: {urlGuestId}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Token recovery successful - show success screen with recovered data
    if (tokenRecoveryState.recovered && tokenRecoveryState.recoveredName && tokenRecoveryState.recoveredEmail) {
      return (
        <SuccessScreen 
          name={tokenRecoveryState.recoveredName} 
          email={tokenRecoveryState.recoveredEmail} 
          onViewReport={handleViewReport}
          guestReportId={urlGuestId}
        />
      );
    }
  }

  return (
    <div className="space-y-0" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* ─────────────────────────────  STEP 1  ───────────────────────────── */}
          <ReportTypeSelector
            control={control}
            errors={errors}
            selectedReportType={selectedReportType}
            showReportGuide={false}
            setShowReportGuide={() => {}}
            setValue={setValue}
          />

          {/* ─────────────────────────────  STEP 2  ───────────────────────────── */}
          {step1Done && (
            <>
              <CombinedPersonalDetailsForm
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                onPlaceSelected={handlePlaceSelected}
              />

              {requiresSecondPerson && (
                <SecondPersonForm
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                />
              )}
            </>
          )}

          {/* ─────────────────────────────  STEP 3  ───────────────────────────── */}
          {step2Done && (
            <div ref={paymentStepRef}>
              <PaymentStep
              register={register}
              watch={watch}
              errors={errors}
              onSubmit={handleButtonClick}
              isProcessing={isProcessing || isPricingLoading}
              promoValidation={promoValidation ? {
                status: promoValidation.isValid ? 
                  (promoValidation.isFree ? 'valid-free' as const : 'valid-discount' as const) : 
                  'invalid' as const,
                message: promoValidation.message,
                discountPercent: promoValidation.discountPercent,
                errorType: promoValidation.errorType
              } : {
                status: 'none' as const,
                message: '',
                discountPercent: 0
              }}
              isValidatingPromo={isValidatingPromo}
              showPromoConfirmation={showPromoConfirmation}
              pendingSubmissionData={pendingSubmissionData}
              onPromoConfirmationTryAgain={handlePromoConfirmationTryAgain}
              onPromoConfirmationContinue={() => handlePromoConfirmationContinue(() => {})}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
