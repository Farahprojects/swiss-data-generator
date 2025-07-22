
import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';

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
import { logReportForm } from '@/utils/logUtils';

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
  
  // Store the guest report ID from successful submissions
  const [createdGuestReportId, setCreatedGuestReportId] = useState<string | null>(null);
  
  const { 
    isProcessing, 
    isPricingLoading, 
    reportCreated, 
    submitReport,
    inlinePromoError,
    clearInlinePromoError,
    resetReportState
  } = useReportSubmission(setCreatedGuestReportId);

  const [viewingReport, setViewingReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Use a ref to store the callback that SuccessScreen will register
  const reportReadyCallbackRef = useRef<((reportData: ReportData) => void) | null>(null);

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

  // State restoration for page refresh scenarios
  const [sessionRestored, setSessionRestored] = useState(false);

  // Remove polling - useGuestReportData now only fetches on demand
  const { data: guestReportData, error: guestReportError, refetch: refetchGuestData } = useGuestReportData(guestId);

  // State restoration effect - handles page refresh scenarios
  React.useEffect(() => {
    if (!guestId || sessionRestored) return;

    logReportForm('info', 'Restoring session state for guest ID', { guestId });
    
    // Immediately set the session as restored to prevent multiple triggers
    setSessionRestored(true);
    
    // Set the created guest report ID to the existing guestId
    setCreatedGuestReportId(guestId);
    
    // Check if this is a fresh Stripe redirect (no existing session data)
    const hasExistingSession = localStorage.getItem('pending_report_email');
    
    if (!hasExistingSession) {
      // This is likely a Stripe redirect - start the unified fetching flow
      logReportForm('info', 'Stripe redirect detected, starting unified data fetching');
      setStripePaymentState(prev => ({ 
        ...prev, 
        isVerifying: true,
        isStripeRedirect: true 
      }));
    } else {
      // This is token recovery - use existing logic
      logReportForm('info', 'Token recovery detected');
      setTokenRecoveryState(prev => ({ ...prev, isRecovering: true, error: null }));
      recoverTokenData(guestId);
    }
  }, [guestId, sessionRestored]);

  // Memoized callback for handling report ready events
  const handleReportReady = useCallback((reportData: ReportData) => {
    logReportForm('info', 'Report ready callback triggered');
    setReportData(reportData);
    setViewingReport(true);
  }, []);

  // Determine the effective guest ID - either from new creation or existing
  const effectiveGuestId = createdGuestReportId || guestId;

  // Handle guest data when guestId is provided
  React.useEffect(() => {
    if (guestId) {
      const hasExistingSession = localStorage.getItem('pending_report_email');
      
      if (!hasExistingSession) {
        logReportForm('info', 'Stripe redirect detected, starting unified data fetching');
        setStripePaymentState(prev => ({ 
          ...prev, 
          isVerifying: true,
          isStripeRedirect: true 
        }));
      } else {
        logReportForm('info', 'Token recovery detected');
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

  // Simple component state reset function
  const resetComponentStates = useCallback(() => {
    logReportForm('debug', 'Resetting component states');
    
    // Reset form state
    form.reset();
    
    // Reset component states
    setViewingReport(false);
    setReportData(null);
    setCreatedGuestReportId(null);
    setSessionRestored(false);
    
    setTokenRecoveryState({
      isRecovering: false,
      recovered: false,
      error: null,
      recoveredName: null,
      recoveredEmail: null,
    });
    
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
    
    logReportForm('debug', 'Component states reset');
  }, [form, resetReportState]);

  React.useEffect(() => {
    if (!guestReportData || !stripePaymentState.isStripeRedirect) return;

    const guestReport = guestReportData.guest_report;
    logReportForm('debug', 'Unified data fetch result', { paymentStatus: guestReport?.payment_status });
    
    if (guestReport?.payment_status === 'paid') {
      logReportForm('info', 'Payment confirmed via unified fetch, transitioning to success state');
      setStripePaymentState({
        isVerifying: false,
        isWaiting: false,
        isComplete: true,
        error: null,
        reportData: guestReportData,
        isStripeRedirect: true,
      });
    } else if (guestReport?.payment_status === 'pending') {
      logReportForm('info', 'Payment pending via unified fetch, starting polling');
      setStripePaymentState(prev => ({
        ...prev,
        isVerifying: false,
        isWaiting: true,
      }));
    } else {
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

  React.useEffect(() => {
    if (guestReportData && stripePaymentState.isWaiting) {
      const guestReport = guestReportData.guest_report;
      logReportForm('debug', 'Polling result', { paymentStatus: guestReport?.payment_status });
      
      if (guestReport?.payment_status === 'paid') {
        logReportForm('info', 'Payment confirmed via polling, transitioning to success state');
        setStripePaymentState({
          isVerifying: false,
          isWaiting: false,
          isComplete: true,
          error: null,
          reportData: guestReportData,
          isStripeRedirect: true,
        });
      }
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
    if (!effectiveGuestId) return;
    
    console.log('🔍 [handleViewReport] Attempting to view report for:', effectiveGuestId);
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      console.log(`🔄 [handleViewReport] Attempt ${attempt}/${maxRetries}`);
      
      if (guestReportData) {
        console.log('✅ [handleViewReport] Using existing guest report data');
        setReportData(guestReportData as ReportData);
        setViewingReport(true);
        return;
      }
      
      if (attempt < maxRetries) {
        console.log('⏳ [handleViewReport] No data found, triggering refetch...');
        try {
          await refetchGuestData();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ [handleViewReport] Refetch attempt ${attempt} failed:`, error);
        }
      }
    }
    
    console.error('❌ [handleViewReport] All retry attempts failed');
    try {
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { id: effectiveGuestId }
      });
      
      if (!error && data) {
        console.log('✅ [handleViewReport] Direct fetch succeeded');
        setReportData(data as ReportData);
        setViewingReport(true);
      } else {
        console.error('❌ [handleViewReport] Direct fetch also failed:', error);
      }
    } catch (error) {
      console.error('❌ [handleViewReport] Direct fetch exception:', error);
    }
  };

  const onSubmit = async (data: ReportFormData) => {
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    const result = await submitReport(submissionData);
    
    // Note: createdGuestReportId is now set automatically in useReportSubmission hook
    // No need to set it here anymore - this eliminates the micro-race
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  if (stripePaymentState.isVerifying || (stripePaymentState.isStripeRedirect && !guestReportData)) {
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
        onBack={() => navigate('/report', { replace: true })}
        isMobile={false}
        onStateReset={resetComponentStates}
      />
    );
  }

  if (viewingReport && isProcessing) {
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
            onClick={() => navigate('/report', { replace: true })}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ADD DEBUG LOGGING: Check all success condition values right before the checks
      logReportForm('debug', 'GateCheck', {
      reportCreated,
      createdGuestReportId,
      userName,
      userEmail,
      guestId
    });

  // Success state checks (these should come before the binary gate)
  if (reportCreated && createdGuestReportId && userName && userEmail) {
    logReportForm('debug', 'Rendering SuccessScreen with guaranteed guest ID', { createdGuestReportId });
    return (
      <SuccessScreen 
        name={userName} 
        email={userEmail} 
        onViewReport={handleViewReport}
        onReportReady={(callback) => {
          reportReadyCallbackRef.current = callback;
        }}
        guestReportId={createdGuestReportId}
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
            reportReadyCallbackRef.current = callback;
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
          reportReadyCallbackRef.current = callback;
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

  // MOVED: Binary gate now comes after all success state checks
  if (!guestId && !reportCreated) {
    console.log('🔄 [ReportForm] No guest ID found - showing fresh form');
    
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
  }

  // Default form rendering
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
