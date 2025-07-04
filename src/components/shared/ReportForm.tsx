
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

  // Check if form should be unlocked (either reportType or request field filled)
  const shouldUnlockForm = !!(selectedReportType || selectedRequest);

  // Check if all key information is filled out
  React.useEffect(() => {
    const formData = form.getValues();
    const hasReportTypeOrRequest = !!(formData.reportType || formData.request);
    const hasPersonalInfo = !!(formData.name && formData.email && formData.birthDate && formData.birthTime);
    const hasLocationWithCoords = !!(formData.birthLocation && formData.birthLatitude && formData.birthLongitude);
    
    if (hasReportTypeOrRequest && hasPersonalInfo && hasLocationWithCoords) {
      console.log('✅ PAYLOAD READY:', {
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
  }, [form.watch(), isValid, shouldUnlockForm, onFormStateChange]);

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
    selectedRequest === 'sync' ||
    selectedRequest === 'sync';

  const handleViewReport = (content: string, pdfData?: string | null) => {
    setReportContent(content);
    setReportPdfData(pdfData || null);
    setViewingReport(true);
  };

  const handleCloseReportViewer = () => {
    setViewingReport(false);
    setReportContent('');
    setReportPdfData(null);
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
          <ReportTypeSelector
            control={control}
            errors={errors}
            selectedReportType={selectedReportType}
            showReportGuide={false}
            setShowReportGuide={() => {}}
            setValue={setValue}
          />

          <FormValidationStatus
            formData={form.getValues()}
            errors={errors}
            requiresSecondPerson={requiresSecondPerson}
          />

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
      </form>
    </div>
  );
};
