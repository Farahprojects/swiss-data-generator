
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import HeroSection from '@/components/public-report/HeroSection';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import ContactForm from '@/components/public-report/ContactForm';
import BirthDetailsForm from '@/components/public-report/BirthDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import SubmissionSection from '@/components/public-report/SubmissionSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import SuccessScreen from '@/components/public-report/SuccessScreen';

const PublicReport = () => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [showReportGuide, setShowReportGuide] = useState(false);
  
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: 'onChange',
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
  const promoCode = watch('promoCode');
  const userName = watch('name');
  const userEmail = watch('email');

  // Debug: log form state
  React.useEffect(() => {
    console.log('📊 Form State Debug:', {
      selectedReportType,
      isValid,
      hasErrors: Object.keys(errors).length > 0,
      errors: errors,
      formValues: watch()
    });
  }, [selectedReportType, isValid, errors, watch]);

  const { promoValidation, isValidatingPromo } = usePromoValidation(promoCode || '');
  const { isProcessing, isPricingLoading, reportCreated, submitReport } = useReportSubmission();

  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const onSubmit = async (data: ReportFormData) => {
    console.log('✅ Form submission successful, data:', data);
    await submitReport(data, promoValidation);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    console.log('🖱️ Button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📝 Triggering form submission...');
    console.log('🔍 Current form errors:', errors);
    console.log('🔍 Form is valid:', isValid);
    
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

  const handlePromoCodeChange = (value: string) => {
    if (value === '') {
      // Handle clearing promo validation when field is cleared
    }
  };

  if (reportCreated && userName && userEmail) {
    return <SuccessScreen name={userName} email={userEmail} />;
  }

  return (
    <div className="h-screen overflow-y-auto scroll-smooth" style={{ scrollSnapType: 'y mandatory' }}>
      <HeroSection />

      <div style={{ scrollSnapType: 'none' }}>
        <form onSubmit={handleSubmit(onSubmit)} className="min-h-screen">
          <ReportTypeSelector
            control={control}
            errors={errors}
            selectedReportType={selectedReportType}
            showReportGuide={showReportGuide}
            setShowReportGuide={setShowReportGuide}
          />

          {selectedReportType && (
            <ContactForm
              register={register}
              errors={errors}
            />
          )}

          {selectedReportType && (
            <BirthDetailsForm
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
              showPromoCode={showPromoCode}
              setShowPromoCode={setShowPromoCode}
              promoValidation={promoValidation}
              isValidatingPromo={isValidatingPromo}
              onPromoCodeChange={handlePromoCodeChange}
              onButtonClick={handleButtonClick}
            />
          )}
        </form>
      </div>

      <FeaturesSection />
    </div>
  );
};

export default PublicReport;
