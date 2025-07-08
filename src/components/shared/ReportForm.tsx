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

  // Clear old state and localStorage on component mount to prevent stale success screens
  React.useEffect(() => {
    localStorage.removeItem('currentGuestReportId');
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

  // Check if this is a compatibility report that needs second person data
  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');
  
  const requiresSecondPerson = reportCategory === 'compatibility' || 
                               reportType?.startsWith('sync_') || 
                               request === 'sync';

  const handleViewReport = (content: string, pdfData?: string | null) => {
    setReportContent(content);
    setReportPdfData(pdfData || null);
    setViewingReport(true);
  };

  const handleCloseReportViewer = () => {
    // Reset all form state and close the entire flow
    setViewingReport(false);
    setReportContent('');
    setReportPdfData(null);
    form.reset();
    localStorage.removeItem('currentGuestReportId');
    localStorage.removeItem('pending_report_email');
    resetReportState();
    // Form reset handled by React state - no page reload needed
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
        onBack={handleCloseReportViewer}
      />
    );
  }

  if (reportCreated && userName && userEmail) {
    const guestReportId = localStorage.getItem('currentGuestReportId');
    return (
      <SuccessScreen 
        name={userName} 
        email={userEmail} 
        onViewReport={handleViewReport}
        guestReportId={guestReportId || undefined}
      />
    );
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
          )}
        </div>
      </form>
    </div>
  );
};
