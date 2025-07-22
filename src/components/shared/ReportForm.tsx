
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { useTokenRecovery } from '@/hooks/useTokenRecovery';
import { useReportStatus, ReportStatus } from '@/hooks/useReportStatus';

import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import SuccessScreen from '@/components/public-report/SuccessScreen';
import { ReportViewer } from '@/components/public-report/ReportViewer';

import { clearGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import { ReportData } from '@/utils/reportContentExtraction';
import { log } from '@/utils/logUtils';

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
  
  // State management
  const [createdGuestReportId, setCreatedGuestReportId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Hooks
  const { status, error: statusError, reportData: statusReportData, setStatus, reset: resetStatus } = useReportStatus();
  const tokenRecovery = useTokenRecovery(guestId);
  
  const { 
    isProcessing, 
    isPricingLoading, 
    reportCreated, 
    submitReport,
    inlinePromoError,
    clearInlinePromoError,
    resetReportState
  } = useReportSubmission(setCreatedGuestReportId);

  const { data: guestReportData, error: guestReportError, refetch: refetchGuestData } = useGuestReportData(guestId);

  // State restoration effect
  useEffect(() => {
    if (!guestId || sessionRestored) return;

    log('info', 'Restoring session state for guest ID', { guestId }, 'ReportForm');
    
    setSessionRestored(true);
    setCreatedGuestReportId(guestId);
    
    const hasExistingSession = localStorage.getItem('pending_report_email');
    
    if (!hasExistingSession) {
      log('info', 'Stripe redirect detected, starting unified data fetching', null, 'ReportForm');
      setStatus('verifying');
    }
  }, [guestId, sessionRestored, setStatus]);

  // Handle guest data when guestId is provided
  useEffect(() => {
    if (!guestReportData || status !== 'verifying') return;

    const guestReport = guestReportData.guest_report;
    log('debug', 'Unified data fetch result', { paymentStatus: guestReport?.payment_status }, 'ReportForm');
    
    if (guestReport?.payment_status === 'paid') {
      log('info', 'Payment confirmed via unified fetch, transitioning to success state', null, 'ReportForm');
      setStatus('success', undefined, guestReportData);
    } else if (guestReport?.payment_status === 'pending') {
      log('info', 'Payment pending via unified fetch, starting polling', null, 'ReportForm');
      setStatus('waiting');
    } else {
      log('error', 'Unexpected payment status', { paymentStatus: guestReport?.payment_status }, 'ReportForm');
      setStatus('error', `Payment status: ${guestReport?.payment_status}`);
    }
  }, [guestReportData, status, setStatus]);

  // Handle polling for waiting payments
  useEffect(() => {
    if (guestReportData && status === 'waiting') {
      const guestReport = guestReportData.guest_report;
      log('debug', 'Polling result', { paymentStatus: guestReport?.payment_status }, 'ReportForm');
      
      if (guestReport?.payment_status === 'paid') {
        log('info', 'Payment confirmed via polling, transitioning to success state', null, 'ReportForm');
        setStatus('success', undefined, guestReportData);
      }
    }
    
    if (guestReportError && status === 'waiting') {
      log('error', 'Polling error', guestReportError, 'ReportForm');
      setStatus('error', 'Failed to verify payment status');
    }
  }, [guestReportData, guestReportError, status, setStatus]);

  // Form setup
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

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid } } = form;

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

  // Auto-scroll to top when transitioning to success screen
  useEffect(() => {
    const isSuccessState = 
      (reportCreated && createdGuestReportId && userName && userEmail) ||
      (status === 'success' && statusReportData) ||
      (guestId && tokenRecovery.recovered && tokenRecovery.recoveredName && tokenRecovery.recoveredEmail);
    
    if (isSuccessState) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [reportCreated, createdGuestReportId, userName, userEmail, status, statusReportData, guestId, tokenRecovery.recovered, tokenRecovery.recoveredName, tokenRecovery.recoveredEmail]);

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

  // Form state change effect
  useEffect(() => {
    const checkFormCompletion = async () => {
      const formData = form.getValues();
      const hasReportTypeOrRequest = !!(formData.reportType || formData.request);
      const hasPersonalInfo = !!(formData.name && formData.email && formData.birthDate && formData.birthTime);
      const hasLocationWithCoords = !!(formData.birthLocation && formData.birthLatitude && formData.birthLongitude);
      
      onFormStateChange?.(isValid, shouldUnlockForm);
    };
    
    checkFormCompletion();
  }, [form.watch(), isValid, shouldUnlockForm, onFormStateChange]);

  const effectiveGuestId = createdGuestReportId || guestId;

  const resetComponentStates = useCallback(() => {
    log('debug', 'Resetting component states', null, 'ReportForm');
    
    form.reset();
    setViewingReport(false);
    setReportData(null);
    setCreatedGuestReportId(null);
    setSessionRestored(false);
    
    tokenRecovery.reset();
    resetStatus();
    resetReportState();
    
    log('debug', 'Component states reset', null, 'ReportForm');
  }, [form, tokenRecovery, resetStatus, resetReportState]);

  // Scroll handling refs
  const paymentStepRef = useRef<HTMLDivElement>(null);
  const secondPersonRef = useRef<HTMLDivElement>(null);

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

  // Fixed report viewing function that properly opens modal
  const handleViewReport = useCallback(async (reportDataParam?: ReportData) => {
    log('info', 'handleViewReport called', { hasParam: !!reportDataParam, effectiveGuestId }, 'ReportForm');
    
    // If report data is passed directly, use it
    if (reportDataParam) {
      log('info', 'Using provided report data', null, 'ReportForm');
      setReportData(reportDataParam);
      setViewingReport(true);
      return;
    }

    if (!effectiveGuestId) {
      log('warn', 'No effective guest ID for report viewing', null, 'ReportForm');
      return;
    }
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      log('debug', `Report fetch attempt ${attempt}/${maxRetries}`, null, 'ReportForm');
      
      if (guestReportData) {
        log('info', 'Using existing guest report data', null, 'ReportForm');
        setReportData(guestReportData as ReportData);
        setViewingReport(true);
        return;
      }
      
      if (attempt < maxRetries) {
        log('debug', 'Report not ready yet, waiting...', null, 'ReportForm');
        try {
          await refetchGuestData();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          log('debug', `Refetch attempt ${attempt} had no data`, null, 'ReportForm');
        }
      }
    }
    
    log('info', 'Report still generating, trying direct fetch...', null, 'ReportForm');
    try {
      const { data, error } = await supabase.functions.invoke('get-guest-report', {
        body: { id: effectiveGuestId }
      });
      
      if (!error && data) {
        log('info', 'Direct fetch succeeded', null, 'ReportForm');
        setReportData(data as ReportData);
        setViewingReport(true);
      } else {
        log('info', 'Report is still being generated in background', null, 'ReportForm');
      }
    } catch (error) {
      log('info', 'Report generation in progress', { error }, 'ReportForm');
    }
  }, [effectiveGuestId, guestReportData, refetchGuestData]);

  // Fixed callback registration for SuccessScreen
  const handleReportReadyCallback = useCallback((callback: (reportData: ReportData) => void) => {
    log('info', 'Report ready callback registered from SuccessScreen', null, 'ReportForm');
    // Store the callback and immediately trigger handleViewReport when called
    const wrappedCallback = (reportData: ReportData) => {
      log('info', 'Report ready callback triggered, calling handleViewReport', null, 'ReportForm');
      handleViewReport(reportData);
    };
    // The callback is already set up in SuccessScreen to call handleViewReport
    callback = wrappedCallback;
  }, [handleViewReport]);

  const onSubmit = async (data: ReportFormData) => {
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    await submitReport(submissionData);
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  // Status-based rendering with single switch statement
  switch (status) {
    case 'verifying':
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center space-y-6">
            <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
            <p className="text-xl text-gray-600 font-light">Finalizing your report...</p>
            <p className="text-sm text-gray-500">Please wait while we verify your payment</p>
          </div>
        </div>
      );

    case 'waiting':
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

    case 'error':
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center space-y-6">
            <p className="text-xl text-destructive">Payment verification failed</p>
            <p className="text-sm text-gray-500">{statusError}</p>
            <button 
              onClick={() => navigate('/report')}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      );

    default:
      break;
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

  // Success state checks
  if (reportCreated && createdGuestReportId && userName && userEmail) {
    log('debug', 'Rendering SuccessScreen with guaranteed guest ID', { createdGuestReportId }, 'ReportForm');
    
    return (
      <SuccessScreen 
        name={userName} 
        email={userEmail} 
        onViewReport={handleViewReport}
        onReportReady={handleReportReadyCallback}
        guestReportId={createdGuestReportId}
      />
    );
  }

  if (status === 'success' && statusReportData) {
    const reportData = statusReportData.guest_report?.report_data;
    const name = reportData?.name;
    const email = reportData?.email || statusReportData.guest_report?.email;
    
    if (name && email) {
      return (
        <SuccessScreen 
          name={name} 
          email={email} 
          onViewReport={handleViewReport}
          onReportReady={handleReportReadyCallback}
          guestReportId={guestId || undefined}
        />
      );
    }
  }
  
  if (guestId && tokenRecovery.recovered && tokenRecovery.recoveredName && tokenRecovery.recoveredEmail) {
    return (
      <SuccessScreen 
        name={tokenRecovery.recoveredName} 
        email={tokenRecovery.recoveredEmail} 
        onViewReport={handleViewReport}
        onReportReady={handleReportReadyCallback}
        guestReportId={guestId}
      />
    );
  }
  
  if (guestId && tokenRecovery.isRecovering) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Recovering your session...</p>
        </div>
      </div>
    );
  }
  
  if (guestId && tokenRecovery.error) {
    React.useEffect(() => {
      clearGuestReportId();
      window.history.replaceState({}, '', '/report');
    }, []);
  }

  // Main form rendering - single JSX block guarded by status
  if (status === 'collecting' || (!guestId && !reportCreated)) {
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

  return null;
};
