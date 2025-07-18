import React, { useState } from 'react';
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
import { mapReportPayload } from '@/utils/mapReportPayload';
import { MappedReport } from '@/types/mappedReport';
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
  const navigate = useNavigate();
  
  const [viewingReport, setViewingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportPdfData, setReportPdfData] = useState<string | null>(null);
  const [swissData, setSwissData] = useState<any>(null);
  const [hasReport, setHasReport] = useState<boolean>(false);
  const [swissBoolean, setSwissBoolean] = useState<boolean>(false);
  const [currentReportType, setCurrentReportType] = useState<string>('');

  // URL guest ID state
  const urlGuestId = getGuestReportId();
  
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
    urlGuestId,
    shouldPoll
  );

  // Handle URL guest_id parameter - distinguish between Stripe redirect and token recovery
  React.useEffect(() => {
    const urlGuestId = getGuestReportId();
    if (urlGuestId) {
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
        recoverTokenData(urlGuestId);
      }
      return;
    }
    
    // Only clear if no URL guest ID (fresh start)
    clearGuestReportId();
    localStorage.removeItem('pending_report_email');
  }, []);

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

  const recoverTokenData = async (guestId: string) => {
    try {
      const { data: guestReport, error } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestId)
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
    if (!urlGuestId) return;
    
    setIsLoadingReport(true);
    setReportError(null);
    
    try {
      // Use the unified data fetching approach
      if (guestReportData) {
        console.log('🔍 Using unified guest report data for viewing');
        
        const mappedReport = mapReportPayload(guestReportData);
        setReportContent(mappedReport.reportContent);
        setReportPdfData(mappedReport.pdfData || null);
        setSwissData(mappedReport.swissData);
        setHasReport(mappedReport.hasReport);
        setSwissBoolean(mappedReport.swissBoolean);
        setCurrentReportType(mappedReport.reportType);
        setViewingReport(true);
      } else {
        throw new Error('Report data not available');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      setReportError('Failed to load report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleCloseReportViewer = () => {
    setViewingReport(false);
    setReportContent('');
    setReportPdfData(null);
    setSwissData(null);
    setHasReport(false);
    setSwissBoolean(false);
    setCurrentReportType('');
    
    form.reset();
    
    clearGuestReportId();
    localStorage.removeItem('currentGuestReportId');
    localStorage.removeItem('pending_report_email');
    
    resetReportState();
    
    navigate('/report');
  };

  const onSubmit = async (data: ReportFormData) => {
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    await submitReport(submissionData);
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

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
          guestReportId={urlGuestId || undefined}
        />
      );
    }
  }
  
  if (urlGuestId && tokenRecoveryState.recovered && tokenRecoveryState.recoveredName && tokenRecoveryState.recoveredEmail) {
    return (
      <SuccessScreen 
        name={tokenRecoveryState.recoveredName} 
        email={tokenRecoveryState.recoveredEmail} 
        onViewReport={handleViewReport}
        guestReportId={urlGuestId}
      />
    );
  }
  
  if (urlGuestId && tokenRecoveryState.isRecovering) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Recovering your session...</p>
        </div>
      </div>
    );
  }
  
  if (urlGuestId && tokenRecoveryState.error) {
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
