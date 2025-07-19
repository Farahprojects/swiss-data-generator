import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { useReportOrchestrator } from '@/hooks/useReportOrchestrator';

import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import SuccessScreen from '@/components/public-report/SuccessScreen';
import { ReportViewer } from '@/components/public-report/ReportViewer';
import { FormValidationStatus } from '@/components/public-report/FormValidationStatus';

import { clearGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import { ReportData } from '@/utils/reportContentExtraction';

interface ReportFormProps {
  coachSlug?: string;
  themeColor?: string;
  fontFamily?: string;
  guestId?: string | null;
  onFormStateChange?: (isValid: boolean, hasSelectedType: boolean) => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ 
  coachSlug,
  themeColor = '#6366F1',
  fontFamily = 'Inter',
  guestId = null,
  onFormStateChange
}) => {
  const navigate = useNavigate();
  const { setupOrchestratorListener } = useReportOrchestrator();
  
  const [viewingReport, setViewingReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isResetting, setIsResetting] = useState(false);

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

  // Stripe payment state for handling post-payment flow
  const [stripePaymentState, setStripePaymentState] = useState<{
    isVerifying: boolean;
    isWaiting: boolean;
    isComplete: boolean;
    error: string | null;
    reportData: any | null;
    isStripeRedirect: boolean;
  }>({
    isVerifying: false,
    isWaiting: false,
    isComplete: false,
    error: null,
    reportData: null,
    isStripeRedirect: false,
  });

  // Unified data fetching: determine polling state based on Stripe redirect status
  const shouldPoll = stripePaymentState.isWaiting;
  const { data: guestReportData, error: guestReportError, isLoading: isPolling } = useGuestReportData(
    guestId,
    shouldPoll
  );

  // Memoized callback for handling orchestrator report ready events
  const handleReportReady = useCallback((reportData: ReportData) => {
    console.log('🎯 [ReportForm] Orchestrator report ready callback triggered');
    setReportData(reportData);
    setViewingReport(true);
  }, []);

  // Set up orchestrator listener when we have a guestId and are in success states
  React.useEffect(() => {
    if (!guestId) return;

    // Check if we're in any success state that should trigger the listener
    const inSuccessState = reportCreated || 
                          stripePaymentState.isComplete || 
                          tokenRecoveryState.recovered;

    if (inSuccessState) {
      console.log('🔄 [ReportForm] Setting up orchestrator listener for:', guestId);
      const cleanup = setupOrchestratorListener(guestId, handleReportReady);
      return cleanup;
    }
  }, [guestId, setupOrchestratorListener, handleReportReady, reportCreated, stripePaymentState.isComplete, tokenRecoveryState.recovered]);

  // Handle guest data when guestId is provided
  React.useEffect(() => {
    if (guestId) {
      // Check if this is a fresh Stripe redirect (no existing session data)
      const hasExistingSession = localStorage.getItem('pending_report_email');
      
      if (!hasExistingSession) {
        // This is likely a Stripe redirect - start the unified fetching flow
        console.log('🔄 Stripe redirect detected, starting unified data fetching...');
        setStripePaymentState(prev => ({ 
          ...prev, 
          isVerifying: true,
          isStripeRedirect: true 
        }));
      } else {
        // This is token recovery - use existing logic
        console.log('🔄 Token recovery detected...');
        setTokenRecoveryState(prev => ({ ...prev, isRecovering: true, error: null }));
        recoverTokenData(guestId);
      }
    }
  }, [guestId]);

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

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid }, formState } = form;

  const selectedReportType = watch('reportType');
  const selectedRequest = watch('request');
  const selectedReportCategory = watch('reportCategory');
  const userName = watch('name');
  const userEmail = watch('email');

  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');
  
  const requiresSecondPerson = reportCategory === 'compatibility' || 
                               reportType?.startsWith('sync_') || 
                               request === 'sync';

  const formValues = form.watch();
  const step1Done = Boolean(formValues.reportType || formValues.request);

  const step2Done =
    step1Done &&
    Boolean(
      formValues.name &&
        formValues.email &&
        formValues.birthDate &&
        formValues.birthTime &&
        formValues.birthLocation,
    ) &&
    (!requiresSecondPerson || (
      formValues.secondPersonName &&
      formValues.secondPersonBirthDate &&
      formValues.secondPersonBirthTime &&
      formValues.secondPersonBirthLocation
    ));

  const shouldUnlockForm = !!(selectedReportType || selectedRequest);

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
    inlinePromoError,
    clearInlinePromoError,
    resetReportState
  } = useReportSubmission();

  const recoverTokenData = async (guestIdParam: string) => {
    try {
      const { data: guestReport, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestIdParam)
        .single();

      if (error || !guestReport) {
        throw new Error('Report not found');
      }

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

  // Comprehensive state reset function
  const resetAllStates = useCallback(() => {
    console.log('🧹 Starting comprehensive state reset...');
    
    // Reset form state
    form.reset();
    
    // Reset component states
    setViewingReport(false);
    setReportData(null);
    
    // Reset token recovery state to initial values
    setTokenRecoveryState({
      isRecovering: false,
      recovered: false,
      error: null,
      recoveredName: null,
      recoveredEmail: null,
    });
    
    // Reset stripe payment state to initial values
    setStripePaymentState({
      isVerifying: false,
      isWaiting: false,
      isComplete: false,
      error: null,
      reportData: null,
      isStripeRedirect: false,
    });
    
    // Reset report submission state
    resetReportState();
    
    // Comprehensive localStorage cleanup
    const currentGuestId = localStorage.getItem('currentGuestReportId');
    if (currentGuestId) {
      localStorage.removeItem(`guest_report_${currentGuestId}`);
      localStorage.removeItem(`guest_report_data_${currentGuestId}`);
    }
    localStorage.removeItem('currentGuestReportId');
    localStorage.removeItem('pending_report_email');
    
    // Clear any other report-related localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('guest_report_') || 
          key.startsWith('report_') || 
          key.includes('temp_report') ||
          key.includes('chat_token')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear URL guest report ID
    clearGuestReportId();
    
    console.log('✅ State reset completed');
  }, [form, resetReportState]);

  // Unified data handling: Process guest report data from the single source of truth
  React.useEffect(() => {
    if (!guestReportData || !stripePaymentState.isStripeRedirect) return;

    const guestReport = guestReportData.guest_report;
    console.log('📊 Unified data fetch result - payment status:', guestReport?.payment_status);
    
    if (guestReport?.payment_status === 'paid') {
      console.log('✅ Payment confirmed via unified fetch! Transitioning to success state...');
      setStripePaymentState({
        isVerifying: false,
        isWaiting: false,
        isComplete: true,
        error: null,
        reportData: guestReportData,
        isStripeRedirect: true,
      });
    } else if (guestReport?.payment_status === 'pending') {
      // Start polling since payment is still pending
      console.log('⏳ Payment pending via unified fetch, starting polling...');
      setStripePaymentState(prev => ({
        ...prev,
        isVerifying: false,
        isWaiting: true,
      }));
    } else {
      // Payment failed or other status
      console.error('❌ Unexpected payment status:', guestReport?.payment_status);
      setStripePaymentState({
        isVerifying: false,
        isWaiting: false,
        isComplete: false,
        error: `Payment status: ${guestReport?.payment_status}`,
        reportData: null,
        isStripeRedirect: false,
      });
    }
  }, [guestReportData, stripePaymentState.isStripeRedirect]);

  // Handle polling results for payment verification
  React.useEffect(() => {
    if (guestReportData && stripePaymentState.isWaiting) {
      const guestReport = guestReportData.guest_report;
      console.log('📊 Polling result - payment status:', guestReport?.payment_status);
      
      if (guestReport?.payment_status === 'paid') {
        console.log('✅ Payment confirmed via polling! Transitioning to success state...');
        setStripePaymentState({
          isVerifying: false,
          isWaiting: false,
          isComplete: true,
          error: null,
          reportData: guestReportData,
          isStripeRedirect: true,
        });
      }
      // If still pending, continue polling (hook handles this automatically)
    }
    
    if (guestReportError && stripePaymentState.isWaiting) {
      console.error('❌ Polling error:', guestReportError);
      setStripePaymentState(prev => ({
        ...prev,
        isWaiting: false,
        error: 'Failed to verify payment status',
      }));
    }
  }, [guestReportData, guestReportError, stripePaymentState.isWaiting]);

  const paymentStepRef = React.useRef<HTMLDivElement>(null);
  const secondPersonRef = React.useRef<HTMLDivElement>(null);

  const handleFirstPersonPlaceSelected = () => {
    const isDesktop = window.innerWidth >= 640;
    if (!isDesktop) return;
    
    setTimeout(() => {
      if (requiresSecondPerson) {
        secondPersonRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else {
        paymentStepRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 300);
  };

  const handleSecondPersonPlaceSelected = () => {
    const isDesktop = window.innerWidth >= 640;
    if (!isDesktop) return;
    
    setTimeout(() => {
      paymentStepRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 300);
  };

  const handleViewReport = async () => {
    if (!guestId) return;
    
    try {
      // Use the unified data fetching approach - directly set the raw data
      if (guestReportData) {
        console.log('🔍 Using unified guest report data for viewing');
        setReportData(guestReportData as ReportData);
        setViewingReport(true);
      } else {
        throw new Error('Report data not available');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    }
  };

  const handleCloseReportViewer = useCallback(async () => {
    console.log('🔄 Starting session close and reset...');
    
    // Prevent multiple simultaneous resets
    if (isResetting) return;
    
    setIsResetting(true);
    
    try {
      // Reset all component states
      resetAllStates();
      
      // Small delay to ensure all React state updates complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate back to report page
      navigate('/report', { replace: true });
      
    } catch (error) {
      console.error('Error during session reset:', error);
      // Fallback: still navigate even if there's an error
      navigate('/report', { replace: true });
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, resetAllStates, navigate]);

  const onSubmit = async (data: ReportFormData) => {
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    await submitReport(submissionData);
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  // Show resetting state
  if (isResetting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Closing session...</p>
        </div>
      </div>
    );
  }

  // Unified loading states for Stripe flow
  if (stripePaymentState.isVerifying || (stripePaymentState.isStripeRedirect && isPolling && !guestReportData)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Finalizing your report...</p>
          <p className="text-sm text-gray-500">Please wait while we verify your payment</p>
        </div>
      </div>
    );
  }

  if (stripePaymentState.isWaiting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Processing payment...</p>
          <p className="text-sm text-gray-500">This usually takes just a few seconds</p>
          <div className="flex items-center justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (stripePaymentState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <p className="text-xl text-destructive">Payment verification failed</p>
          <p className="text-sm text-gray-500">{stripePaymentState.error}</p>
          <button 
            onClick={() => navigate('/report')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (viewingReport && reportData) {
    return (
      <ReportViewer
        reportData={reportData}
        onBack={handleCloseReportViewer}
        isMobile={false}
      />
    );
  }

  if (viewingReport && isPolling) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (viewingReport && (guestReportError || !guestReportData)) {
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

  if (reportCreated && userName && userEmail) {
    return (
      <SuccessScreen 
        name={userName} 
        email={userEmail} 
        onViewReport={handleViewReport}
        onReportReady={(callback) => {
          // Store the callback for orchestrator to use
          handleReportReady.current = callback;
        }}
        guestReportId={guestId || undefined}
      />
    );
  }

  if (stripePaymentState.isComplete && stripePaymentState.reportData) {
    const reportData = stripePaymentState.reportData.guest_report?.report_data;
    const name = reportData?.name;
    const email = reportData?.email || stripePaymentState.reportData.guest_report?.email;
    
    if (name && email) {
      return (
        <SuccessScreen 
          name={name} 
          email={email} 
          onViewReport={handleViewReport}
          onReportReady={(callback) => {
            // Store the callback for orchestrator to use
            handleReportReady.current = callback;
          }}
          guestReportId={guestId || undefined}
        />
      );
    }
  }
  
  if (guestId && tokenRecoveryState.recovered && tokenRecoveryState.recoveredName && tokenRecoveryState.recoveredEmail) {
    return (
      <SuccessScreen 
        name={tokenRecoveryState.recoveredName} 
        email={tokenRecoveryState.recoveredEmail} 
        onViewReport={handleViewReport}
        onReportReady={(callback) => {
          // Store the callback for orchestrator to use
          handleReportReady.current = callback;
        }}
        guestReportId={guestId}
      />
    );
  }
  
  if (guestId && tokenRecoveryState.isRecovering) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Recovering your session...</p>
        </div>
      </div>
    );
  }
  
  if (guestId && tokenRecoveryState.error) {
    React.useEffect(() => {
      clearGuestReportId();
      window.history.replaceState({}, '', '/report');
    }, []);
  }

  return (
    <div className="space-y-0" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          <ReportTypeSelector
            control={control}
            errors={errors}
            selectedReportType={selectedReportType}
            showReportGuide={false}
            setShowReportGuide={() => {}}
            setValue={setValue}
          />

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

          {step2Done && (
            <div ref={paymentStepRef}>
              <PaymentStep
              register={register}
              watch={watch}
              errors={errors}
              setValue={setValue}
              onSubmit={handleButtonClick}
              isProcessing={isProcessing || isPricingLoading}
              inlinePromoError={inlinePromoError}
              clearInlinePromoError={clearInlinePromoError}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
