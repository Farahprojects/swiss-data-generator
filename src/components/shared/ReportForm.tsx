
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import SubmissionSection from '@/components/public-report/SubmissionSection';
import SuccessScreen from '@/components/public-report/SuccessScreen';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

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
  const [promoValidation, setPromoValidation] = useState<PromoValidationState>({
    status: 'none',
    message: '',
    discountPercent: 0
  });
  
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
    },
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid } } = form;
  const selectedReportType = watch('reportType');
  const userName = watch('name');
  const userEmail = watch('email');

  // Notify parent of form state changes
  React.useEffect(() => {
    onFormStateChange?.(isValid, !!selectedReportType);
  }, [isValid, selectedReportType, onFormStateChange]);

  const { isProcessing, isPricingLoading, reportCreated, submitReport } = useReportSubmission();

  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const onSubmit = async (data: ReportFormData) => {
    console.log('✅ Form submission successful, data:', data);
    // Add coach attribution if provided
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    await submitReport(submissionData, promoValidation, setPromoValidation);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    console.log('🖱️ Button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    
    handleSubmit(
      (data) => {
        console.log('✅ Form validation passed, submitting:', data);
        onSubmit(data);
      },
      (errors) => {
        console.log('❌ Form validation failed:', errors);
      }
    )(e);
  };

  if (reportCreated && userName && userEmail) {
    return <SuccessScreen name={userName} email={userEmail} />;
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

          {selectedReportType && (
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

          {selectedReportType && (
            <SubmissionSection
              register={register}
              errors={errors}
              isProcessing={isProcessing}
              isPricingLoading={isPricingLoading}
              promoValidation={promoValidation}
              onButtonClick={handleButtonClick}
            />
          )}
        </div>
      </form>
    </div>
  );
};
