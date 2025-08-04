
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission, TrustedPricingObject } from '@/hooks/useReportSubmission';
import { useTokenRecovery } from '@/hooks/useTokenRecovery';
import { useReportStatus, ReportStatus } from '@/hooks/useReportStatus';

import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import SuccessScreen from '@/components/public-report/SuccessScreen';
import { clearGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import { ReportData } from '@/utils/reportContentExtraction';
import { log } from '@/utils/logUtils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { useGuestSessionManager } from '@/hooks/useGuestSessionManager';

interface ReportFormProps {
  coachSlug?: string;
  themeColor?: string;
  fontFamily?: string;
  guestId?: string | null;
  onFormStateChange?: (isValid: boolean, hasSelectedType: boolean) => void;
  onSuccessScroll?: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ 
  coachSlug,
  themeColor = '#6366F1',
  fontFamily = 'Inter',
  guestId = null,
  onFormStateChange,
  onSuccessScroll
}) => {
  const navigate = useNavigate();
  
  // State management
  const [createdGuestReportId, setCreatedGuestReportId] = useState<string | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [waitingForReport, setWaitingForReport] = useState(false);
  
  // Modal context - simplified
  const { open } = useReportModal();

  // Hooks
  const { status, error: statusError, reportData: statusReportData, setStatus, reset: resetStatus } = useReportStatus();
  const tokenRecovery = useTokenRecovery(guestId);
  
  const { 
    isProcessing, 
    reportCreated, 
    submitReport,
    resetReportState
  } = useReportSubmission(setCreatedGuestReportId);

  const { data: guestReportData, error: guestReportError, refetch: refetchGuestData } = useGuestReportData(guestId);
  const { handleSessionReset } = useGuestSessionManager(guestId);
  
  // Handle guest report errors gracefully - delegate to session manager
  useEffect(() => {
    if (guestReportError) {
      console.warn('[ReportForm] Guest report error detected, delegating to session manager');
      handleSessionReset('report_form_error');
    }
  }, [guestReportError, handleSessionReset]);
  
  /**
   *  👉  ONE-SHOT REFRESH RECOVERY
   *  If we loaded the page with an existing guestReportId and the server
   *  says the report is already finished, open the modal immediately.
   */
  useEffect(() => {
    if (
      guestReportData &&               // we just fetched data
      (guestReportData.report_content || guestReportData.swiss_data) // it's real
    ) {
      open(guestReportData);           // 🎉 single source of truth
    }
  }, [guestReportData, open]);

  // Handle token recovery error
  useEffect(() => {
    if (guestId && tokenRecovery.error) {
      clearGuestReportId();
      window.history.replaceState({}, '', '/report');
    }
  }, [guestId, tokenRecovery.error]);

  // State restoration effect
  useEffect(() => {
    if (!guestId || sessionRestored) return;

    log('info', 'Restoring session state for guest ID', { guestId }, 'ReportForm');
    
    setSessionRestored(true);
    setCreatedGuestReportId(guestId);
    
    // 🔥 SMART CHECK: Is payment already confirmed?
    const storedPaymentStatus = localStorage.getItem('guest_payment_status');
    const storedGuestId = localStorage.getItem('guest_report_id');
    
    if (storedPaymentStatus === 'paid' && storedGuestId === guestId) {
      log('info', 'Payment already confirmed, skipping validation and fetching report data', null, 'ReportForm');
      setStatus('success');
      // Fetch report data directly
      return;
    }
    
    // Original Stripe redirect logic (only if payment not already confirmed)
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
      // 🔥 STORE PAYMENT STATUS
      localStorage.setItem('guest_payment_status', 'paid');
      localStorage.setItem('guest_report_id', guestId);
      setStatus('success', undefined, guestReportData);
    } else if (guestReport?.payment_status === 'pending') {
      log('info', 'Payment pending, waiting for realtime update', null, 'ReportForm');
      setStatus('waiting');
    } else if (guestReport?.payment_status === undefined || guestReport?.payment_status === null) {
      log('info', 'No payment status found, clearing session for fresh start', null, 'ReportForm');
      handleSessionReset('no_payment_status');
    } else {
      log('error', 'Unexpected payment status', { paymentStatus: guestReport?.payment_status }, 'ReportForm');
      setStatus('error', `Payment status: ${guestReport?.payment_status}`);
    }
  }, [guestReportData, status, setStatus, handleSessionReset, guestId]);

  // Scroll to success screen when status changes to success
  useEffect(() => {
    if (status === 'success' && onSuccessScroll) {
      // Small delay to ensure the success screen has rendered
      setTimeout(() => {
        onSuccessScroll();
      }, 100);
    }
  }, [status, onSuccessScroll]);

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
  }, [form, isValid, shouldUnlockForm, onFormStateChange]);

  const effectiveGuestId = createdGuestReportId || guestId;

  const resetComponentStates = useCallback(() => {
    log('debug', 'Resetting component states', null, 'ReportForm');
    
    form.reset();
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





  const onSubmit = async (data: ReportFormData) => {
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    // This will be called by PaymentStep with the final price and promo code
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  const handleSubmitWithTrustedPricing = async (trustedPricing: TrustedPricingObject) => {
    const formData = form.getValues();
    const submissionData = coachSlug ? { ...formData, coachSlug } : formData;
    await submitReport(submissionData, trustedPricing);
  };

  /* ↓ everything else follows ↓ */
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

  // Success state checks
  if (reportCreated && createdGuestReportId && userName && userEmail) {
    return (
      <SuccessScreen 
        name={userName} 
        email={userEmail} 
        guestReportId={createdGuestReportId}
        onStartWaiting={() => setWaitingForReport(true)}
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
          guestReportId={guestId || undefined}
          onStartWaiting={() => setWaitingForReport(true)}
        />
      );
    }
  }
  
  if (guestId && tokenRecovery.recovered && tokenRecovery.recoveredName && tokenRecovery.recoveredEmail) {
    return (
      <SuccessScreen 
        name={tokenRecovery.recoveredName} 
        email={tokenRecovery.recoveredEmail} 
        guestReportId={guestId}
        onStartWaiting={() => setWaitingForReport(true)}
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
                onSubmitWithTrustedPricing={handleSubmitWithTrustedPricing}
                isProcessing={isProcessing}
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
