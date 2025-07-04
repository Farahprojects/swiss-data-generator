
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import SuccessScreen from '@/components/public-report/SuccessScreen';
import DesktopReportViewer from '@/components/public-report/DesktopReportViewer';
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
    resolver: zodResolver(reportSchema),
    mode: 'onBlur',
    defaultValues: {
      reportType: '',
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
  const selectedAstroDataType = watch('astroDataType');
  const userName = watch('name');
  const userEmail = watch('email');

  // Check if form should be unlocked (either reportType or request field filled)
  const shouldUnlockForm = !!(selectedReportType || selectedRequest);

  // Notify parent of form state changes
  React.useEffect(() => {
    onFormStateChange?.(isValid, shouldUnlockForm);
  }, [isValid, shouldUnlockForm, onFormStateChange]);

  const { 
    isProcessing, 
    isPricingLoading, 
    reportCreated, 
    submitReport,
    showPromoConfirmation,
    pendingSubmissionData,
    handlePromoConfirmationTryAgain,
    handlePromoConfirmationContinue
  } = useReportSubmission();

  const requiresSecondPerson = 
    selectedReportType === 'sync' || 
    selectedReportType === 'compatibility' ||
    selectedReportCategory === 'compatibility' ||
    selectedAstroDataType === 'sync' ||
    selectedRequest === 'sync';

  const handleViewReport = (content: string, pdfData?: string | null) => {
    console.log('📄 Opening report viewer with content:', content ? 'Content loaded' : 'No content');
    setReportContent(content);
    setReportPdfData(pdfData || null);
    setViewingReport(true);
  };

  const handleCloseReportViewer = () => {
    console.log('❌ Closing report viewer');
    setViewingReport(false);
    setReportContent('');
    setReportPdfData(null);
  };

  const onSubmit = async (data: ReportFormData) => {
    // STEP 3: Log entry into onSubmit function
    await logToAdmin('ReportForm', 'onSubmit_entry', 'onSubmit function called', {
      hasReportType: !!data.reportType,
      hasRequest: !!data.request,
      reportCategory: data.reportCategory,
      astroDataType: data.astroDataType,
      isValid: isValid,
      formErrors: Object.keys(errors),
      reportType: data.reportType,
      request: data.request
    });

    console.log('✅ Form submission successful, data:', data);
    
    // Add coach attribution if provided
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

    // Log the submission data transformation
    await logToAdmin('ReportForm', 'onSubmit_data_prep', 'Prepared submission data', {
      hasCoachSlug: !!coachSlug,
      promoValidationStatus: promoValidationState.status,
      submissionDataKeys: Object.keys(submissionData)
    });
    
    await submitReport(submissionData, promoValidationState, () => {});
  };

  const handleButtonClick = async () => {
    // STEP 1: Log form button click
    const formData = form.getValues();
    await logToAdmin('ReportForm', 'button_click', 'Get My Insights button clicked', {
      reportType: formData.reportType,
      request: formData.request,
      reportCategory: formData.reportCategory,
      astroDataType: formData.astroDataType,
      isValid: isValid,
      hasErrors: Object.keys(errors).length > 0,
      errorFields: Object.keys(errors),
      shouldUnlockForm: shouldUnlockForm
    });

    console.log('🖱️ Button clicked!');
    
    // STEP 2: Log handleSubmit execution
    handleSubmit(
      async (data) => {
        await logToAdmin('ReportForm', 'handleSubmit_success', 'Form validation passed', {
          reportType: data.reportType,
          request: data.request,
          reportCategory: data.reportCategory,
          astroDataType: data.astroDataType
        });
        console.log('✅ Form validation passed, submitting:', data);
        await onSubmit(data);
      },
      async (errors) => {
        await logToAdmin('ReportForm', 'handleSubmit_error', 'Form validation failed', {
          errors: errors,
          errorFields: Object.keys(errors),
          formData: form.getValues()
        });
        console.log('❌ Form validation failed:', errors);
      }
    )();
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
          <ReportTypeSelector
            control={control}
            errors={errors}
            selectedReportType={selectedReportType}
            showReportGuide={false}
            setShowReportGuide={() => {}}
            setValue={setValue}
          />

          {shouldUnlockForm && (
            <CombinedPersonalDetailsForm
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
            />
          )}

          {requiresSecondPerson && (
            <SecondPersonForm
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
            />
          )}

          {shouldUnlockForm && (
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
