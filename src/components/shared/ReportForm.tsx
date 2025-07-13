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
import { ReportViewer } from '@/components/public-report/ReportViewer';
import { mapReportPayload } from '@/utils/mapReportPayload';
import { FormValidationStatus } from '@/components/public-report/FormValidationStatus';

import { clearGuestReportId, getGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useGuestReportData } from '@/hooks/useGuestReportData';

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
  const { promoValidation, isValidatingPromo, validatePromoManually, resetValidation } = usePromoValidation();
  const [viewingReport, setViewingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportPdfData, setReportPdfData] = useState<string | null>(null);
  const [swissData, setSwissData] = useState<any>(null);
  const [hasReport, setHasReport] = useState<boolean>(false);
  const [swissBoolean, setSwissBoolean] = useState<boolean>(false);
  const [currentReportType, setCurrentReportType] = useState<string>('');

  // Get guest report data - hook called unconditionally
  const urlGuestId = getGuestReportId();
  const { data: guestReportData, isLoading: isLoadingReport, error: reportError } = useGuestReportData(urlGuestId);
  
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

  // Check if this is a compatibility report that needs second person data
  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');
  
  const requiresSecondPerson = reportCategory === 'compatibility' || 
                               reportType?.startsWith('sync_') || 
                               request === 'sync';

  // Auto-scroll functionality for desktop
  const [lastFirstPersonPlaceTime, setLastFirstPersonPlaceTime] = React.useState<number>(0);
  const [lastSecondPersonPlaceTime, setLastSecondPersonPlaceTime] = React.useState<number>(0);
  const paymentStepRef = React.useRef<HTMLDivElement>(null);
  const secondPersonRef = React.useRef<HTMLDivElement>(null);

  // Check if first person form is complete (excluding second person requirements)
  const firstPersonData = {
    name: watch('name'),
    email: watch('email'),
    birthDate: watch('birthDate'),
    birthTime: watch('birthTime'),
    birthLocation: watch('birthLocation')
  };
  const firstPersonComplete = firstPersonData.name && firstPersonData.email && 
                              firstPersonData.birthDate && firstPersonData.birthTime && 
                              firstPersonData.birthLocation;

  // Auto-scroll to second person when first person place is selected and compatibility report
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= 640; // sm breakpoint
    if (requiresSecondPerson && firstPersonComplete && lastFirstPersonPlaceTime > 0 && isDesktop) {
      const timeSinceSelection = Date.now() - lastFirstPersonPlaceTime;
      if (timeSinceSelection < 2000) { // Within 2 seconds of place selection
        setTimeout(() => {
          secondPersonRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 300); // Small delay to ensure DOM is updated
      }
    }
  }, [requiresSecondPerson, firstPersonComplete, lastFirstPersonPlaceTime]);

  // Auto-scroll to payment step when second person place is selected or step2 is complete
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= 640; // sm breakpoint
    if (step2Done && isDesktop) {
      // For compatibility reports, check if second person place was just selected
      if (requiresSecondPerson && lastSecondPersonPlaceTime > 0) {
        const timeSinceSelection = Date.now() - lastSecondPersonPlaceTime;
        if (timeSinceSelection < 2000) {
          setTimeout(() => {
            paymentStepRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 300);
        }
      }
      // For non-compatibility reports, use first person place selection
      else if (!requiresSecondPerson && lastFirstPersonPlaceTime > 0) {
        const timeSinceSelection = Date.now() - lastFirstPersonPlaceTime;
        if (timeSinceSelection < 2000) {
          setTimeout(() => {
            paymentStepRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 300);
        }
      }
    }
  }, [step2Done, lastFirstPersonPlaceTime, lastSecondPersonPlaceTime, requiresSecondPerson]);

  const handleFirstPersonPlaceSelected = () => {
    setLastFirstPersonPlaceTime(Date.now());
  };

  const handleSecondPersonPlaceSelected = () => {
    setLastSecondPersonPlaceTime(Date.now());
  };

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
    
    await submitReport(submissionData, promoValidationState, resetValidation);
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  // Show report viewer if user is viewing a report and data is available
  if (viewingReport && guestReportData && !isLoadingReport) {
    console.log('🔍 ReportForm - guestReportData:', guestReportData);
    console.log('🔍 ReportForm - guest_report:', guestReportData.guest_report);
    console.log('🔍 ReportForm - guest_report.report_data:', guestReportData.guest_report?.report_data);
    
    return (
      <ReportViewer
        mappedReport={mapReportPayload({
          guest_report: guestReportData.guest_report,
          report_content: guestReportData.report_content,
          swiss_data: guestReportData.swiss_data,
          metadata: guestReportData.metadata
        })}
        onBack={handleCloseReportViewer}
        isMobile={false}
      />
    );
  }

  // Show loading state when viewing report
  if (viewingReport && isLoadingReport) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  // Show error state when viewing report fails
  if (viewingReport && (reportError || !guestReportData)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load report</p>
          <button 
            onClick={handleCloseReportViewer}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Handle token recovery and success screen logic
  
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
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center space-y-6">
            <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
            <p className="text-xl text-gray-600 font-light">Recovering your session...</p>
          </div>
        </div>
      );
    }
    
    // Token recovery failed - show error
    if (tokenRecoveryState.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-8 text-center">
            <div className="space-y-6">
              <h1 className="text-5xl font-light tracking-tight text-gray-900">
                Session <span className="italic">Recovery</span> Failed
              </h1>
              <p className="text-xl text-gray-600 font-light max-w-lg mx-auto leading-relaxed">
                {tokenRecoveryState.error === 'Report not found' && 'Report not found - please start a new report'}
                {tokenRecoveryState.error === 'Session data corrupted' && 'Session data corrupted - please start a new report'}
                {!['Report not found', 'Session data corrupted'].includes(tokenRecoveryState.error) && 'Unable to recover session - please try again'}
              </p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => {
                  clearGuestReportId();
                  window.location.replace('/');
                }}
                className="w-full bg-gray-900 text-white px-8 py-4 rounded-xl font-light text-lg tracking-wide hover:bg-gray-800 transition-colors"
              >
                Start New Report
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-white text-gray-900 px-8 py-4 rounded-xl font-light text-lg tracking-wide border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
            
            <p className="text-sm text-gray-400 font-light mt-8">
              Need help? Contact support with ID: <span className="font-mono text-gray-500">{urlGuestId}</span>
            </p>
          </div>
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
                onPlaceSelected={handleFirstPersonPlaceSelected}
              />

              {requiresSecondPerson && (
                <div ref={secondPersonRef}>
                  <SecondPersonForm
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                    onPlaceSelected={handleSecondPersonPlaceSelected}
                  />
                </div>
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
              onPromoConfirmationContinue={() => handlePromoConfirmationContinue(resetValidation)}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
