
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import { ReportFormData } from '@/types/public-report';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);

  const {
    form,
    currentStep,
    nextStep,
    prevStep,
  } = useMobileDrawerForm();

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  const { isProcessing, submitReport, reportCreated } = useReportSubmission();
  const { promoValidation, isValidatingPromo } = usePromoValidation();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');

  const handleClose = () => {
    onClose();
    form.reset();
    setShowSuccess(false);
    setSubmittedData(null);
  };

  // Convert promo validation to the state format expected by useReportSubmission
  const promoValidationState = {
    status: promoValidation?.isValid 
      ? (promoValidation.isFree ? 'valid-free' : 'valid-discount')
      : (promoValidation ? 'invalid' : 'none') as 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid',
    message: promoValidation?.message || '',
    discountPercent: promoValidation?.discountPercent || 0
  };

  const setPromoValidation = () => {
    // This will be handled by the hook automatically
  };

  const onSubmit = async (data: ReportFormData) => {
    console.log('🚀 Mobile drawer form submission started');
    console.log('📝 Form data:', data);

    // Store submitted data for success screen
    setSubmittedData({
      name: data.name,
      email: data.email
    });

    // Use the exact same submission logic as desktop
    await submitReport(data, promoValidationState, setPromoValidation);
    
    // Show success screen for free reports, paid reports will redirect to Stripe
    if (reportCreated) {
      setShowSuccess(true);
    }
  };

  const handleFormSubmit = () => {
    console.log('📋 Form submit triggered from Step3Payment');
    handleSubmit(onSubmit)();
  };

  // Progress dots
  const ProgressDots = () => (
    <div className="flex justify-center space-x-2 mb-6">
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            step === currentStep
              ? 'bg-primary'
              : step < currentStep
              ? 'bg-primary/60'
              : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  // Show success screen if report was created successfully
  if (showSuccess && submittedData) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <SuccessScreen 
              name={submittedData.name} 
              email={submittedData.email} 
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <ProgressDots />
          <DrawerTitle className="sr-only">Report Request Flow</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <Step1ReportType
                key="step1"
                control={control}
                setValue={setValue}
                onNext={nextStep}
                selectedCategory={reportCategory}
              />
            )}
            
            {currentStep === 2 && (
              <Step1_5SubCategory
                key="step1_5"
                control={control}
                setValue={setValue}
                onNext={nextStep}
                onPrev={prevStep}
                selectedCategory={reportCategory}
                selectedSubCategory={reportSubCategory}
              />
            )}
            
            {currentStep === 3 && (
              <Step2BirthDetails
                key="step2"
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            
            {currentStep === 4 && (
              <Step3Payment
                key="step3"
                register={register}
                watch={watch}
                errors={errors}
                onPrev={prevStep}
                onSubmit={handleFormSubmit}
                isProcessing={isProcessing}
                promoValidation={promoValidationState}
                isValidatingPromo={isValidatingPromo}
              />
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;
