
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import HeroSection from '@/components/public-report/HeroSection';
import ContactForm from '@/components/public-report/ContactForm';
import BirthDetailsForm from '@/components/public-report/BirthDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import SubmissionSection from '@/components/public-report/SubmissionSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import SuccessScreen from '@/components/public-report/SuccessScreen';
import TestsSection from '@/components/public-report/TestsSection';
import Footer from '@/components/Footer';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

const PublicReport = () => {
  const [showReportGuide, setShowReportGuide] = useState(false);
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

  const { isProcessing, isPricingLoading, reportCreated, submitReport } = useReportSubmission();

  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const onSubmit = async (data: ReportFormData) => {
    console.log('✅ Form submission successful, data:', data);
    await submitReport(data, promoValidation, setPromoValidation);
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

  const handleReportSelect = (reportType: string) => {
    setValue('reportType', reportType);
    // Scroll to next section
    const contactSection = document.querySelector('#contact-form');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (reportCreated && userName && userEmail) {
    return <SuccessScreen name={userName} email={userEmail} />;
  }

  return (
    <div className="overflow-y-auto -mt-16">
      <HeroSection />
      
      <TestsSection 
        control={control}
        errors={errors}
        selectedReportType={selectedReportType}
        onReportSelect={handleReportSelect}
      />

      <div>
        <form onSubmit={handleSubmit(onSubmit)} className="min-h-screen">
          {selectedReportType && (
            <div id="contact-form">
              <ContactForm
                register={register}
                errors={errors}
              />
            </div>
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
              promoValidation={promoValidation}
              onButtonClick={handleButtonClick}
            />
          )}
        </form>
      </div>

      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default PublicReport;
